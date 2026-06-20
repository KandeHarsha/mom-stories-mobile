import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";

// Better Auth mounts at /api/auth by default.
// EXPO_PUBLIC_API_URL points to /api, so strip it to get the server root.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://mom-stories.vercel.app/api";
const BETTER_AUTH_URL = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;

// Resolve the correct scheme per build variant (dev/preview/prod)
const rawScheme = Constants.expoConfig?.scheme;
const scheme = Array.isArray(rawScheme) ? rawScheme[0] : rawScheme ?? "momstoriesmobile";

export const authClient = createAuthClient({
  baseURL: BETTER_AUTH_URL,
  plugins: [
    expoClient({
      scheme,
      storagePrefix: "momstories",
      storage: SecureStore,
    }),
  ],
});
