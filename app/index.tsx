import { Redirect } from "expo-router";
import React from "react";
import { useAuth } from "./hooks/useAuth";

export default function Index() {
  const { isAuthenticated, loading } = useAuth();


  if (loading) {
    return null; // Root layout will show loading
  }

  // Simple one-time redirect based on auth status
  
  return isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}
