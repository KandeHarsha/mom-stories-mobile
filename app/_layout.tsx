import { Stack } from "expo-router";
import "./global.css";
import React from "react";
import { useColorScheme } from "nativewind";
import themes from "../constants/colors";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme] ?? themes.light;

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
    </Stack>
  );
}
