import { Redirect } from "expo-router";
import { useAuth } from "./hooks/useAuth";
import React from "react";

export default function Index() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}
