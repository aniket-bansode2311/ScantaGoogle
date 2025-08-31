import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Suspense, lazy } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { trpc, trpcClient } from "@/lib/trpc";
import { startMetric, endMetric, logPerformanceSummary } from "@/lib/performance";

// Lazy load non-essential providers to improve cold start
const DocumentProvider = lazy(() => import("@/contexts/DocumentContext").then(m => ({ default: m.DocumentProvider })));
const DocumentEditingProvider = lazy(() => import("@/contexts/DocumentEditingContext").then(m => ({ default: m.DocumentEditingProvider })));
const SignatureProvider = lazy(() => import("@/contexts/SignatureContext").then(m => ({ default: m.SignatureProvider })));
const OCRSettingsProvider = lazy(() => import("@/contexts/OCRSettingsContext").then(m => ({ default: m.OCRSettingsProvider })));
const CloudSyncProvider = lazy(() => import("@/contexts/CloudSyncContext").then(m => ({ default: m.CloudSyncProvider })));

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Optimize QueryClient for faster startup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce initial network requests
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
      retry: 1, // Reduce retries for faster failure
      refetchOnWindowFocus: false, // Disable auto-refetch on focus
      refetchOnMount: false, // Don't refetch on mount by default
    },
  },
});

// Loading fallback component
const LoadingFallback = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3b82f6" />
  </View>
);

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
    startMetric('App Initialization');
    
    // Defer splash screen hiding to allow for faster perceived startup
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
      endMetric('App Initialization');
      
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
              <Suspense fallback={<LoadingFallback />}>
                <DocumentProvider>
                  <DocumentEditingProvider>
                    <CloudSyncProvider>
                      <SignatureProvider>
                        <OCRSettingsProvider>
                          <RootLayoutNav />
                        </OCRSettingsProvider>
                      </SignatureProvider>
                    </CloudSyncProvider>
                  </DocumentEditingProvider>
                </DocumentProvider>
              </Suspense>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
