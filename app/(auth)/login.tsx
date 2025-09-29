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

export default function Login() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme] ?? themes.light;
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
        router.replace("/(tabs)");
      } else {
        alert("Login failed");
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
          className="text-4xl font-bold mb-8"
          style={{ color: currentTheme.foreground }}
        >
          Login
        </Text>
        <TextInput
          className="w-4/5 p-4 rounded-lg mb-4"
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
          className="w-4/5 p-4 rounded-lg mb-8"
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
          className="w-4/5 p-4 rounded-lg items-center"
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
