import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import themes from "../constants/colors";
import "./global.css";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme as keyof typeof themes] ?? themes.light;

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