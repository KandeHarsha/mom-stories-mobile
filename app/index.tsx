import { Redirect } from "expo-router";

export default function Index() {
  // Redirect directly to tabs (no authentication required)
  return <Redirect href="/(tabs)" />;
}
