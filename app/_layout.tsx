import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Stack, useRouter, useSegments } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect } from "react";
import themes from "../constants/colors";
import "./global.css";

function RootLayoutNav() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme as keyof typeof themes] ?? themes.light;
  const { session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    if (!session && inTabsGroup) {
      // User is not authenticated but trying to access protected routes
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // User is authenticated but on auth pages
      router.replace("/(tabs)");
    }
  }, [session, segments]);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: currentTheme.background,
        },
        headerTintColor: currentTheme.foreground,
        contentStyle: {
          backgroundColor: currentTheme.background
        }
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="journal/[entryId]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}