import themes from "@/constants/colors";
import { PRIVACY_POLICY, TERMS_OF_USE } from "@/constants/legalContent";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DOCS: Record<string, { title: string; content: string }> = {
  terms: { title: "Terms of Use", content: TERMS_OF_USE },
  privacy: { title: "Privacy Policy", content: PRIVACY_POLICY },
};

export default function LegalDocumentScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || "light"] ?? themes.light;

  const entry = DOCS[doc as string] ?? DOCS.terms;
  const styles = createStyles(currentTheme);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={currentTheme.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{entry.title}</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.bodyText}>{entry.content}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.foreground,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
    scrollContent: {
      paddingVertical: 20,
      paddingBottom: 40,
    },
    bodyText: {
      fontSize: 14,
      lineHeight: 22,
      color: theme.foreground,
    },
  });
