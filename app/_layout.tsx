import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import * as Sentry from '@sentry/react-native';
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect } from "react";
import themes from "../constants/colors";
import "./global.css";

Sentry.init({
  dsn: 'https://543958d2bd8c1fafe8ec5dd49d6e2c8b@o4511059359825920.ingest.us.sentry.io/4511059362643968',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootLayoutNav() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme as keyof typeof themes] ?? themes.light;
  const { session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";
    const isVerifyEmail = segments[0] === "(auth)" && segments[1] === "verifyEmail";

    if (!session && inTabsGroup) {
      // User is not authenticated but trying to access protected routes
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup && !isVerifyEmail) {
      // User is authenticated but on auth pages (except verifyEmail)
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
      <Stack.Screen name="profile/customerSupport" options={{ headerShown: false }} />
      <Stack.Screen name="profile/accountSettings" options={{ headerShown: false }} />
      <Stack.Screen name="medications/index" options={{ headerShown: false }} />
      <Stack.Screen name="appointments/index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
      <RootLayoutNav />
      </NotificationProvider>
    </AuthProvider>
  );
});