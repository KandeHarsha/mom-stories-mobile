import { useAuth } from "@/context/AuthContext";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
import * as Sentry from "@sentry/react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);
  const { session } = useAuth();

  const savePushTokenToBackend = async (token: string) => {
    if (!session?.accessToken) {
      console.log("⚠️ No auth token available, skipping push token save");
      return;
    }

    try {
      const deviceManufacturer = Device.manufacturer || "Unknown";
      const deviceModelName = Device.modelName || "Unknown";

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/push-tokens`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            expoPushToken: token,
            deviceManufacturer,
            deviceModelName,
          }),
        }
      );

      if (response.ok) {
        console.log("✅ Push token saved to backend successfully");
      } else {
        const errorData = await response.text();
        console.error("❌ Failed to save push token to backend:", errorData);
        Sentry.captureException(
          new Error(`Failed to save push token: ${errorData}`)
        );
      }
    } catch (error) {
      console.error("❌ Error saving push token to backend:", error);
      Sentry.captureException(error);
    }
  };

  useEffect(() => {
    registerForPushNotificationsAsync().then(
      (token) => {
        console.log("Push token registered:", token);
        setExpoPushToken(token ?? null);
        
        // Save push token to backend
        if (token) {
          savePushTokenToBackend(token);
        }
      },
      (error) => {
        console.error("❌ Push token registration failed:", error);
        setError(error);
        Sentry.captureException(error);
        // Don't throw the error, just log it
      }
    );

    // Check current permission status
    Notifications.getPermissionsAsync().then((status) => {
      console.log("📱 Notification permissions:", status);
    }).catch((error) => {
      console.error("❌ Failed to get notification permissions:", error);
      Sentry.captureException(error);
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("🔔 Notification Received: ", notification);
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(
          "🔔 Notification Response: ",
          JSON.stringify(response, null, 2),
          JSON.stringify(response.notification.request.content.data, null, 2)
        );
        // Handle the notification response here
        Sentry.captureException(new Error(`Notification Response: ${JSON.stringify(response)}`));
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Save push token when session becomes available
  useEffect(() => {
    if (session?.accessToken && expoPushToken) {
      savePushTokenToBackend(expoPushToken);
    }
  }, [session?.accessToken]);

  return (
    <NotificationContext.Provider
      value={{ expoPushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  );
};