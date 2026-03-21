import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import themes from "../../constants/colors";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function VerifyEmail() {
  const { user, session, refreshUser } = useAuth();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const currentTheme =
    themes[colorScheme as keyof typeof themes] ?? themes.light;

  const [otp, setOtp] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  const handleVerifyEmail = async () => {
    if (!otp.trim()) {
      Alert.alert("Error", "Please enter the OTP");
      return;
    }

    if (!user?.email || !session?.accessToken) {
      Alert.alert("Error", "Unable to verify email. Please try again.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/email-otp/verify-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: `${API_BASE_URL}`,
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            email: user.email,
            otp: otp.trim(),
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Success",
          "Your email has been verified successfully!",
          [
            {
              text: "OK",
              onPress: async () => {
                await refreshUser();
                router.replace("/(tabs)/profile");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Error",
          data.message || "Failed to verify email. Please check your OTP and try again."
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "An error occurred while verifying email. Please try again."
      );
      console.error("Verify email error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!user?.email || !session?.accessToken) {
      Alert.alert("Error", "Unable to resend OTP. Please try again.");
      return;
    }

    setResending(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/email-otp/send-verification-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: `${API_BASE_URL}`,
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            email: user.email,
            type: "email-verification",
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Success",
          "Verification OTP has been resent to your email."
        );
        setOtp("");
      } else {
        Alert.alert(
          "Error",
          data.message || "Failed to resend OTP. Please try again."
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "An error occurred while resending OTP. Please try again."
      );
      console.error("Resend OTP error:", error);
    } finally {
      setResending(false);
    }
  };

  return (
    <View
      className="flex-1"
      style={{
        paddingTop: top,
        backgroundColor: currentTheme.background,
      }}
    >
      <View className="flex-1 justify-center items-center px-4">
        <Text
          className="mb-4 font-bold text-4xl"
          style={{ color: currentTheme.foreground }}
        >
          Verify Email
        </Text>
        <Text
          className="mb-8 text-center text-base"
          style={{ color: currentTheme.mutedForeground }}
        >
          We've sent a verification code to
        </Text>
        <Text
          className="mb-8 text-center font-semibold text-base"
          style={{ color: currentTheme.primary }}
        >
          {user?.email}
        </Text>

        <TextInput
          className="mb-8 p-4 rounded-lg w-full"
          style={{
            backgroundColor: currentTheme.card,
            color: currentTheme.foreground,
          }}
          placeholder="Enter OTP"
          placeholderTextColor={currentTheme.mutedForeground}
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />

        <TouchableOpacity
          className="items-center p-4 rounded-lg w-full"
          style={{ backgroundColor: currentTheme.primary }}
          onPress={handleVerifyEmail}
          disabled={loading || resending}
        >
          {loading ? (
            <ActivityIndicator color={currentTheme.primaryForeground} />
          ) : (
            <Text
              className="font-bold text-lg"
              style={{ color: currentTheme.primaryForeground }}
            >
              Verify Email
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-4"
          onPress={handleResendOTP}
          disabled={loading || resending}
        >
          <Text
            className="text-base"
            style={{ color: currentTheme.primary }}
          >
            {resending ? "Resending..." : "Resend OTP"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-4"
          onPress={() => router.back()}
          disabled={loading || resending}
        >
          <Text
            className="text-base"
            style={{ color: currentTheme.mutedForeground }}
          >
            Back to{" "}
            <Text style={{ color: currentTheme.primary }}>Profile</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
