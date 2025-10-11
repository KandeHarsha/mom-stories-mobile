import { Stack, useRouter, useSegments } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import themes from "../constants/colors";
import "./global.css";
import { useAuth } from "./hooks/useAuth";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme as keyof typeof themes] ?? themes.light;
  const { isAuthenticated, loading, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Simplified routing - only protect tabs from unauthenticated access
  useEffect(() => {
    
    if (loading) {
      return;
    }

    const inTabsGroup = segments[0] === "(tabs)";
    const actuallyAuthenticated = isAuthenticated && !!token;

    // Only redirect if trying to access tabs without authentication
    if (!actuallyAuthenticated && inTabsGroup) {
      router.replace("/(auth)/login");
    } else {
    }
  }, [isAuthenticated, loading, segments, token]);

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: currentTheme.background 
      }}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="journal/[entryId]" options={{ headerShown: false }} />
    </Stack>
  );
}