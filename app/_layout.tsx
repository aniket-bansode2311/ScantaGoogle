import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { DocumentProvider } from "@/contexts/DocumentContext";
import { SignatureProvider } from "@/contexts/SignatureContext";
import { OCRSettingsProvider } from "@/contexts/OCRSettingsContext";
import AuthGuard from "@/components/AuthGuard";
import { trpc, trpcClient } from "@/lib/trpc";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

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
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DocumentProvider>
            <SignatureProvider>
              <OCRSettingsProvider>
                <GestureHandlerRootView>
                  <AuthGuard>
                    <RootLayoutNav />
                  </AuthGuard>
                </GestureHandlerRootView>
              </OCRSettingsProvider>
            </SignatureProvider>
          </DocumentProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
