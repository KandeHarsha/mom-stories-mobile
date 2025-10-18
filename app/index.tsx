import { useAuth } from "@/context/AuthContext";
import { Redirect } from "expo-router";
import React from "react";

export default function Index() {
  const { session } = useAuth();

  return session ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}
