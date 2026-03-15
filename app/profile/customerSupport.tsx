import themes from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import {
    AlertCircle,
    Bug,
    CheckCircle,
    Clock,
    Lightbulb,
    MessageSquare,
    Plus,
    X,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

type TicketType = "bugReport" | "featureRequest" | "general";
type TicketStatus = "submitted" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  type: TicketType;
  userId: string;
  status: TicketStatus;
  query: string;
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  };
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  email?: string;
}

const CustomerSupport = () => {
  const { session } = useAuth();
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || "light"] ?? themes.light;
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TicketType>("general");

  const ticketTypes = [
    { value: "bugReport", label: "Bug Report", icon: Bug },
    { value: "featureRequest", label: "Feature Request", icon: Lightbulb },
    { value: "general", label: "General Inquiry", icon: MessageSquare },
  ];

  const fetchTickets = async () => {
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/customer-support`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data || []);
      } else {
        console.error("Failed to fetch tickets");
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [session]);

  const handleSubmitTicket = async () => {
    if (!query.trim()) {
      Alert.alert("Error", "Please enter your query");
      return;
    }

    if (!session?.accessToken) {
      Alert.alert("Error", "You must be logged in to submit a ticket");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/customer-support`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          query: query.trim(),
          type,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert("Success", data.message || "Ticket submitted successfully!");
        setModalVisible(false);
        setQuery("");
        setType("general");
        fetchTickets(); // Refresh the list
      } else {
        // Show error from API if present, otherwise show generic message
        const errorMessage = data.error || data.message || "Failed to submit ticket. Please try again.";
        Alert.alert("Error", errorMessage);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "An error occurred while submitting ticket. Please try again."
      );
      console.error("Submit ticket error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case "submitted":
        return <Clock size={16} color={currentTheme.primary} />;
      case "in_progress":
        return <AlertCircle size={16} color="#f59e0b" />;
      case "resolved":
        return <CheckCircle size={16} color="#10b981" />;
      case "closed":
        return <CheckCircle size={16} color={currentTheme.mutedForeground} />;
      default:
        return <Clock size={16} color={currentTheme.mutedForeground} />;
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case "submitted":
        return currentTheme.primary;
      case "in_progress":
        return "#f59e0b";
      case "resolved":
        return "#10b981";
      case "closed":
        return currentTheme.mutedForeground;
      default:
        return currentTheme.mutedForeground;
    }
  };

  const getTypeIcon = (ticketType: TicketType) => {
    const typeObj = ticketTypes.find((t) => t.value === ticketType);
    if (typeObj) {
      const Icon = typeObj.icon;
      return <Icon size={20} color={currentTheme.primary} />;
    }
    return <MessageSquare size={20} color={currentTheme.primary} />;
  };

  const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const styles = createStyles(currentTheme);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Customer Support</Text>
        <Text style={styles.subtitle}>Submit and track your support tickets</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={currentTheme.primary} />
            <Text style={styles.loadingText}>Loading tickets...</Text>
          </View>
        ) : tickets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageSquare size={48} color={currentTheme.mutedForeground} />
            <Text style={styles.emptyTitle}>No Support Tickets</Text>
            <Text style={styles.emptyMessage}>
              You haven't submitted any support tickets yet. Tap the button below to
              create your first ticket.
            </Text>
          </View>
        ) : (
          <View style={styles.ticketsContainer}>
            {tickets.map((ticket) => (
              <View key={ticket.id} style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <View style={styles.ticketTypeContainer}>
                    {getTypeIcon(ticket.type)}
                    <Text style={styles.ticketType}>
                      {ticketTypes.find((t) => t.value === ticket.type)?.label ||
                        ticket.type}
                    </Text>
                  </View>
                  <View style={styles.ticketStatusContainer}>
                    {getStatusIcon(ticket.status)}
                    <Text
                      style={[
                        styles.ticketStatus,
                        { color: getStatusColor(ticket.status) },
                      ]}
                    >
                      {ticket.status.replace("_", " ")}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ticketQuery}>{ticket.query}</Text>
                <View style={styles.ticketFooter}>
                  <Text style={styles.ticketId}>ID: {ticket.id}</Text>
                  <Text style={styles.ticketDate}>
                    {formatDate(ticket.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color={currentTheme.primaryForeground} />
      </TouchableOpacity>

      {/* Add Ticket Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Support Ticket</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color={currentTheme.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeSelector}>
                {ticketTypes.map((ticketType) => {
                  const Icon = ticketType.icon;
                  return (
                    <TouchableOpacity
                      key={ticketType.value}
                      style={[
                        styles.typeOption,
                        type === ticketType.value && styles.typeOptionSelected,
                      ]}
                      onPress={() => setType(ticketType.value as TicketType)}
                    >
                      <Icon
                        size={20}
                        color={
                          type === ticketType.value
                            ? currentTheme.primaryForeground
                            : currentTheme.primary
                        }
                      />
                      <Text
                        style={[
                          styles.typeOptionText,
                          type === ticketType.value &&
                            styles.typeOptionTextSelected,
                        ]}
                      >
                        {ticketType.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Your Query</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe your issue or request in detail..."
                placeholderTextColor={currentTheme.mutedForeground}
                value={query}
                onChangeText={setQuery}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitTicket}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={currentTheme.primaryForeground} />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Ticket</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default CustomerSupport;

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      marginBottom: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: theme.primary,
      fontWeight: "500",
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.foreground,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: theme.mutedForeground,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: theme.mutedForeground,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.foreground,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyMessage: {
      fontSize: 14,
      color: theme.mutedForeground,
      textAlign: "center",
      lineHeight: 20,
    },
    ticketsContainer: {
      paddingVertical: 16,
    },
    ticketCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.foreground,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 3,
    },
    ticketHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    ticketTypeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    ticketType: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.cardForeground,
    },
    ticketStatusContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.muted,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    ticketStatus: {
      fontSize: 12,
      fontWeight: "500",
      textTransform: "capitalize",
    },
    ticketQuery: {
      fontSize: 14,
      color: theme.cardForeground,
      marginBottom: 12,
      lineHeight: 20,
    },
    ticketFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    ticketId: {
      fontSize: 12,
      color: theme.mutedForeground,
      fontFamily: "monospace",
    },
    ticketDate: {
      fontSize: 12,
      color: theme.mutedForeground,
    },
    fab: {
      position: "absolute",
      bottom: 20,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.foreground,
    },
    closeButton: {
      padding: 4,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.foreground,
      marginBottom: 12,
    },
    typeSelector: {
      flexDirection: "column",
      gap: 8,
      marginBottom: 20,
    },
    typeOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: "transparent",
    },
    typeOptionSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    typeOptionText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.cardForeground,
    },
    typeOptionTextSelected: {
      color: theme.primaryForeground,
    },
    textArea: {
      backgroundColor: theme.card,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: theme.foreground,
      minHeight: 120,
      marginBottom: 20,
    },
    submitButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.primaryForeground,
    },
  });
