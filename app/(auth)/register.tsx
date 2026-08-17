import { useAuth } from "@/context/AuthContext";
import { Redirect, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import themes from "../../constants/colors";

const validPhases = ["preparation", "pregnancy", "post_delivery"];

export default function Register() {
    const { session, signup } = useAuth();
    const router = useRouter();
    const { top } = useSafeAreaInsets();
    const { colorScheme } = useColorScheme();
    const currentTheme = themes[colorScheme as keyof typeof themes] ?? themes.light;

    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [phase, setPhase] = React.useState("preparation");
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
            const result = await signup(name.trim(), email.trim(), password.trim(), phase);
            
            if (result.success) {
                if (result.autoLogin) {
                    // User is automatically logged in, navigation will happen via AuthContext
                    Alert.alert(
                        "Registration Successful",
                        "Your account has been created and you are now logged in!",
                        [
                            {
                                text: "OK",
                                onPress: () => {
                                    // Navigation will be handled automatically by the auth flow
                                },
                            },
                        ]
                    );
                } else {
                    // Redirect to login page
                    Alert.alert(
                        "Registration Successful",
                        "Your account has been created successfully. Please proceed to login.",
                        [
                            {
                                text: "OK",
                                onPress: () => router.push("/(auth)/login"),
                            },
                        ]
                    );
                }
            } else {
                Alert.alert("Registration Failed", "Something went wrong. Please try again.");
            }
        } catch (error) {
            console.error("Register: Error:", error);
            Alert.alert("Error", "Failed to register. Please try again.");
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
            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}
                keyboardShouldPersistTaps="handled"
            >
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
                    className="mb-4 p-4 rounded-lg w-4/5"
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
                
                {/* Phase Selection */}
                <View className="mb-6 w-4/5">
                    <Text
                        className="mb-3 font-semibold text-base"
                        style={{ color: currentTheme.foreground }}
                    >
                        Current Phase
                    </Text>
                    <View className="flex-row justify-between">
                        {validPhases.map((phaseOption) => (
                            <TouchableOpacity
                                key={phaseOption}
                                className="flex-1 mx-1 p-3 rounded-lg"
                                style={{
                                    backgroundColor: phase === phaseOption ? currentTheme.primary : currentTheme.card,
                                    borderWidth: 1,
                                    borderColor: phase === phaseOption ? currentTheme.primary : currentTheme.border,
                                }}
                                onPress={() => setPhase(phaseOption)}
                            >
                                <Text
                                    className="font-medium text-sm text-center"
                                    style={{
                                        color: phase === phaseOption ? currentTheme.primaryForeground : currentTheme.foreground,
                                    }}
                                >
                                    {phaseOption === 'preparation' ? 'Preparing' : 
                                     phaseOption === 'pregnancy' ? 'Pregnant' : 
                                     'Post Delivery'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <Text
                    className="mb-4 px-2 text-xs text-center w-4/5"
                    style={{ color: currentTheme.mutedForeground }}
                >
                    By registering, you agree to our{" "}
                    <Text
                        style={{ color: currentTheme.primary }}
                        onPress={() => router.push("/legal/terms")}
                    >
                        Terms of Use
                    </Text>{" "}
                    and{" "}
                    <Text
                        style={{ color: currentTheme.primary }}
                        onPress={() => router.push("/legal/privacy")}
                    >
                        Privacy Policy
                    </Text>
                    .
                </Text>
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
            </ScrollView>
        </View>
    );
}
