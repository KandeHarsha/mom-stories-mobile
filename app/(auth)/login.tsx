import { useAuth } from "@/context/AuthContext";
import { AntDesign } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import themes from "../../constants/colors";

export default function Login() {
  const { session, signin, signinWithGoogle } = useAuth();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme as keyof typeof themes] ?? themes.light;

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Please enter both email and password");
      return;
    }
    signin(email, password)
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signinWithGoogle();
    } finally {
      setGoogleLoading(false);
    }
  };

  if (session) return <Redirect href={'../(tabs)'} />
  
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

        {/* OR divider */}
        <View className="flex-row items-center w-4/5 my-4">
          <View className="flex-1 h-px" style={{ backgroundColor: currentTheme.border }} />
          <Text className="mx-3 text-sm" style={{ color: currentTheme.mutedForeground }}>OR</Text>
          <View className="flex-1 h-px" style={{ backgroundColor: currentTheme.border }} />
        </View>

        {/* Google Sign-In */}
        <TouchableOpacity
          className="flex-row items-center justify-center p-4 rounded-lg w-4/5"
          style={{
            backgroundColor: currentTheme.card,
            borderWidth: 1,
            borderColor: currentTheme.border,
          }}
          onPress={handleGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color={currentTheme.foreground} />
          ) : (
            <>
              <AntDesign name="google" size={20} color="#4285F4" style={{ marginRight: 10 }} />
              <Text className="font-semibold text-base" style={{ color: currentTheme.foreground }}>
                Continue with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-4"
          onPress={() => router.push("/(auth)/forgotPassword")}
        >
          <Text
            className="text-base"
            style={{ color: currentTheme.primary }}
          >
            Forgot Password?
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="mt-2"
          onPress={() => router.push("/(auth)/register")}
        >
          <Text
            className="text-base"
            style={{ color: currentTheme.mutedForeground }}
          >
            Don't have an account?{" "}
            <Text style={{ color: currentTheme.primary }}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
