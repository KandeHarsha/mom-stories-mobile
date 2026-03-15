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

export default function ForgotPassword() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const currentTheme =
    themes[colorScheme as keyof typeof themes] ?? themes.light;

  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [otpSent, setOtpSent] = React.useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/email-otp/send-verification-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: `${API_BASE_URL}`,
          },
          body: JSON.stringify({
            email: email.trim(),
            type: "forget-password",
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        Alert.alert(
          "Success",
          "Verification OTP has been sent to your email. Please check your inbox."
        );
      } else {
        Alert.alert(
          "Error",
          data.message || "Failed to send OTP. Please try again."
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "An error occurred while sending OTP. Please try again."
      );
      console.error("Send OTP error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim() || !newPassword.trim()) {
      Alert.alert("Error", "Please enter both OTP and new password");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(
        "Error",
        "Password must be at least 8 characters long"
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/email-otp/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: `${API_BASE_URL}`,
          },
          body: JSON.stringify({
            email: email.trim(),
            otp: otp.trim(),
            password: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Success",
          "Your password has been reset successfully. You can now login with your new password.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(auth)/login"),
            },
          ]
        );
      } else {
        Alert.alert(
          "Error",
          data.message || "Failed to reset password. Please try again."
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "An error occurred while resetting password. Please try again."
      );
      console.error("Reset password error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (otpSent) {
      handleResetPassword();
    } else {
      handleSendOTP();
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
          Forgot Password
        </Text>
        <Text
          className="mb-8 text-center text-base"
          style={{ color: currentTheme.mutedForeground }}
        >
          {otpSent
            ? "Enter the OTP sent to your email and your new password"
            : "Enter your email address to receive a verification OTP"}
        </Text>

        <TextInput
          className="mb-4 p-4 rounded-lg w-full"
          style={{
            backgroundColor: otpSent
              ? currentTheme.muted
              : currentTheme.card,
            color: otpSent
              ? currentTheme.mutedForeground
              : currentTheme.foreground,
          }}
          placeholder="Email"
          placeholderTextColor={currentTheme.mutedForeground}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!otpSent}
        />

        {otpSent && (
          <>
            <TextInput
              className="mb-4 p-4 rounded-lg w-full"
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
            <TextInput
              className="mb-8 p-4 rounded-lg w-full"
              style={{
                backgroundColor: currentTheme.card,
                color: currentTheme.foreground,
              }}
              placeholder="New Password"
              placeholderTextColor={currentTheme.mutedForeground}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </>
        )}

        {!otpSent && <View className="mb-8" />}

        <TouchableOpacity
          className="items-center p-4 rounded-lg w-full"
          style={{ backgroundColor: currentTheme.primary }}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={currentTheme.primaryForeground} />
          ) : (
            <Text
              className="font-bold text-lg"
              style={{ color: currentTheme.primaryForeground }}
            >
              {otpSent ? "Reset Password" : "Send OTP"}
            </Text>
          )}
        </TouchableOpacity>

        {otpSent && (
          <TouchableOpacity
            className="mt-4"
            onPress={() => {
              setOtpSent(false);
              setOtp("");
              setNewPassword("");
            }}
            disabled={loading}
          >
            <Text
              className="text-base"
              style={{ color: currentTheme.primary }}
            >
              Resend OTP
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className="mt-4"
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text
            className="text-base"
            style={{ color: currentTheme.mutedForeground }}
          >
            Back to{" "}
            <Text style={{ color: currentTheme.primary }}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
