import { useAuth } from "@/context/AuthContext";
import { Redirect, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import themes from "../../constants/colors";

export default function Register() {
    const { session } = useAuth();
    const router = useRouter();
    const { top } = useSafeAreaInsets();
    const { colorScheme } = useColorScheme();
    const currentTheme = themes[colorScheme as keyof typeof themes] ?? themes.light;

    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("https://mom-stories.vercel.app/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    password: password.trim(),
                    phase: "fourth_trimester",
                }),
            });

            const data = await response.json();

            if (data.success) {
                Alert.alert(
                    "Registration Successful",
                    "A verification email has been sent to your inbox. Please verify your email and proceed to login.",
                    [
                        {
                            text: "OK",
                            onPress: () => router.push("/(auth)/login"),
                        },
                    ]
                );
            } else {
                Alert.alert("Registration Failed", data.message || "Something went wrong");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to register. Please try again.");
            console.error("Registration error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (session) return <Redirect href={"../(tabs)"} />;

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
                        Register
                    </Text>
                    <TextInput
                        className="mb-4 p-4 rounded-lg w-4/5"
                        style={{
                            backgroundColor: currentTheme.card,
                            color: currentTheme.foreground,
                        }}
                        placeholder="Name"
                        placeholderTextColor={currentTheme.mutedForeground}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                    />
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
                        className="mb-4 p-4 rounded-lg w-4/5"
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
                    <TextInput
                        className="mb-8 p-4 rounded-lg w-4/5"
                        style={{
                            backgroundColor: currentTheme.card,
                            color: currentTheme.foreground,
                        }}
                        placeholder="Confirm Password"
                        placeholderTextColor={currentTheme.mutedForeground}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />
                    <TouchableOpacity
                        className="items-center p-4 rounded-lg w-4/5"
                        style={{ backgroundColor: currentTheme.primary }}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={currentTheme.primaryForeground} />
                        ) : (
                            <Text
                                className="font-bold text-lg"
                                style={{ color: currentTheme.primaryForeground }}
                            >
                                Register
                            </Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="mt-4"
                        onPress={() => router.push("/(auth)/login")}
                    >
                        <Text
                            className="text-base"
                            style={{ color: currentTheme.mutedForeground }}
                        >
                            Already have an account?{" "}
                            <Text style={{ color: currentTheme.primary }}>Login</Text>
                        </Text>
                    </TouchableOpacity>
            </View>
        </View>
    );
}
