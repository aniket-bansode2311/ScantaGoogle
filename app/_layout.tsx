import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { trpc, trpcClient } from "@/lib/trpc";
import { startMetric, endMetric, logPerformanceSummary } from "@/lib/performance";

// Import contexts directly
import { DocumentProvider } from "@/contexts/DocumentContext";
import { SignatureProvider } from "@/contexts/SignatureContext";
import { OCRSettingsProvider } from "@/contexts/OCRSettingsContext";
import { CloudSyncProvider } from "@/contexts/CloudSyncContext";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Optimize QueryClient for faster startup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce initial network tasks
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
      retry: 1, // No need to retry for faster failure
      refetchOnWindowFocus: false, // Disable auto-refetch on focus
      refetchOnMount: false, // Don't refetch on mount by default
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    startMetric("App Initialization");
    
    // Defer splash screen hiding to allow for faster perceived startup
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
      endMetric("App Initialization");
      
      // Log performance summary after a short delay
      setTimeout(() => {
        logPerformanceSummary();
      }, 1000);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthGuard>
              <DocumentProvider>
                <CloudSyncProvider>
                  <SignatureProvider>
                    <OCRSettingsProvider>
                      <RootLayoutNav />
                    </OCRSettingsProvider>
                  </SignatureProvider>
                </CloudSyncProvider>
              </DocumentProvider>
            </AuthGuard>
          </GestureHandlerRootView>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#f8f9fa',
  },
});
