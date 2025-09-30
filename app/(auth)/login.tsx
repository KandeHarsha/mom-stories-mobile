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
  const currentTheme = themes[colorScheme] ?? themes.light;
  const { login } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
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
        // Extract token from the nested data structure
        const token = responseData.data?.access_token ||
          responseData.access_token ||
          responseData.data?.token ||
          responseData.token;

        if (token) {
          await login(token);
          router.replace("/(tabs)");
        } else {
          alert("Login failed: No token received");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || "Login failed");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred");
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
