import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuth } from "./hooks/useAuth";

export default function Index() {
  const { isAuthenticated, loading } = useAuth();

  console.log('Index - loading:', loading, 'isAuthenticated:', isAuthenticated);

  if (loading) {
    // Show a proper loading screen instead of null
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}
