import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import themes from "../../constants/colors";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme as keyof typeof themes] ?? themes.light;
  const { loginWithResponse } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/auth/emailLogin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );
      if (response.ok) {
        const responseData = await response.json();

        // Use the new loginWithResponse method to handle the full response
        await loginWithResponse(responseData);
        // Manual redirect as fallback
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 100);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || `Login failed: ${response.status} - Invalid credentials`);
      }
    } catch (error) {
      alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
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
      <View className="flex-1 justify-center items-center">
        <Text
          className="mb-8 font-bold text-4xl"
          style={{ color: currentTheme.foreground }}
        >
          Login
        </Text>
        <TextInput
          className="mb-4 p-4 rounded-lg w-4/5"
          style={{
            backgroundColor: currentTheme.card,
            color: currentTheme.foreground,
          }}
          placeholder="Email"
          placeholderTextColor={currentTheme.mutedForeground}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="mb-8 p-4 rounded-lg w-4/5"
          style={{
            backgroundColor: currentTheme.card,
            color: currentTheme.foreground,
          }}
          placeholder="Password"
          placeholderTextColor={currentTheme.mutedForeground}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity
          className="items-center p-4 rounded-lg w-4/5"
          style={{ backgroundColor: currentTheme.primary }}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={currentTheme.primaryForeground} />
          ) : (
            <Text
              className="font-bold text-lg"
              style={{ color: currentTheme.primaryForeground }}
            >
              Login
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
