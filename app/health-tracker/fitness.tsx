import {
    DEFAULT_STEP_GOAL,
    MAX_STEP_GOAL,
    MIN_STEP_GOAL,
    fetchHealthKitData,
    getFitnessHistory,
    isHealthKitAvailable,
    requestHealthKitPermissions,
    syncFitnessData,
    updateStepGoal,
    type FitnessDataPoint,
} from '@/app/services/fitness-service';
import { fetchAccessToken } from '@/app/utils';
import themes from '@/constants/colors';
import { Activity, Flame, Footprints, Pencil, TrendingUp, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useState } from 'react';
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
} from 'react-native';

const DAYS = 7;

const getDayLabel = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const getStepsBadge = (steps: number): { label: string; color: string } => {
  if (steps >= 10000) return { label: 'Great', color: '#10b981' };
  if (steps >= 5000) return { label: 'Good', color: '#f59e0b' };
  return { label: 'Low', color: '#ef4444' };
};

export default function FitnessTab() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const styles = createStyles(currentTheme);

  const [data, setData] = useState<FitnessDataPoint[]>([]);
  const [stepGoal, setStepGoal] = useState(DEFAULT_STEP_GOAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthKitDenied, setHealthKitDenied] = useState(false);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await fetchAccessToken();

      if (!isHealthKitAvailable()) {
        // On Android or simulator — fall back to backend history
        if (token) {
          const history = await getFitnessHistory(token, DAYS);
          setData(history.data);
          setStepGoal(history.stepGoal);
        }
        setLoading(false);
        return;
      }

      const granted = await requestHealthKitPermissions();
      if (!granted) {
        setHealthKitDenied(true);
        setLoading(false);
        return;
      }

      const points = await fetchHealthKitData(DAYS);
      setData(points);

      if (token) {
        // Sync to backend in background — don't block UI
        syncFitnessData(token, points).catch(() => {
          // Non-critical: sync failure shouldn't break the UI
        });

        // Fetch the persisted step goal — HealthKit has no concept of goals
        getFitnessHistory(token, DAYS)
          .then(history => setStepGoal(history.stepGoal))
          .catch(() => {
            // Non-critical: fall back to the last known/default goal
          });
      }
    } catch (err) {
      setError('Failed to load fitness data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openGoalModal = () => {
    setGoalInput(String(stepGoal));
    setShowGoalModal(true);
  };

  const handleSaveGoal = async () => {
    const parsed = parseInt(goalInput, 10);
    if (!Number.isInteger(parsed) || parsed < MIN_STEP_GOAL || parsed > MAX_STEP_GOAL) {
      Alert.alert(
        'Invalid Goal',
        `Please enter a step goal between ${MIN_STEP_GOAL.toLocaleString()} and ${MAX_STEP_GOAL.toLocaleString()}.`,
      );
      return;
    }

    setSavingGoal(true);
    try {
      const token = await fetchAccessToken();
      if (!token) throw new Error('Not authenticated');
      await updateStepGoal(token, parsed);
      setStepGoal(parsed);
      setShowGoalModal(false);
    } catch {
      Alert.alert('Error', 'Failed to update step goal. Please try again.');
    } finally {
      setSavingGoal(false);
    }
  };

  const today = data.find(d => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return d.date === todayKey;
  }) ?? { steps: 0, stairsClimbed: 0, caloriesBurned: 0, date: '' };

  const weeklySteps = data.reduce((sum, d) => sum + d.steps, 0);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={styles.loadingText}>Reading fitness data…</Text>
      </View>
    );
  }

  if (healthKitDenied) {
    return (
      <View style={styles.centered}>
        <Activity size={48} color={currentTheme.mutedForeground} />
        <Text style={styles.emptyTitle}>Health Access Denied</Text>
        <Text style={styles.emptySubtitle}>
          Go to Settings → Health → Mom Stories and allow read access to Steps,
          Flights Climbed, and Active Energy.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isHealthKitAvailable() && data.length === 0) {
    return (
      <View style={styles.centered}>
        <Activity size={48} color={currentTheme.mutedForeground} />
        <Text style={styles.emptyTitle}>Not Available</Text>
        <Text style={styles.emptySubtitle}>
          Fitness tracking via Apple Health is only available on iOS devices.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Today's Summary Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Activity size={24} color={currentTheme.primary} />
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>Today's Activity</Text>
            <Text style={styles.cardDescription}>Live data from Apple Health</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {/* Steps */}
          <View style={[styles.summaryItem, { backgroundColor: currentTheme.muted }]}>
            <Footprints size={20} color={currentTheme.primary} />
            <Text style={styles.summaryValue}>{today.steps.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Steps</Text>
          </View>

          {/* Stairs */}
          <View style={[styles.summaryItem, { backgroundColor: currentTheme.muted }]}>
            <TrendingUp size={20} color="#8b5cf6" />
            <Text style={styles.summaryValue}>{today.stairsClimbed}</Text>
            <Text style={styles.summaryLabel}>Flights</Text>
          </View>

          {/* Calories */}
          <View style={[styles.summaryItem, { backgroundColor: currentTheme.muted }]}>
            <Flame size={20} color="#ef4444" />
            <Text style={styles.summaryValue}>{today.caloriesBurned.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>kcal</Text>
          </View>
        </View>

        {/* Step Goal */}
        <View style={styles.goalRow}>
          <View style={styles.goalInfo}>
            <Text style={styles.goalText}>
              {today.steps.toLocaleString()} / {stepGoal.toLocaleString()} steps
            </Text>
            <View style={styles.goalProgressTrack}>
              <View
                style={[
                  styles.goalProgressFill,
                  {
                    width: `${Math.min(100, (today.steps / stepGoal) * 100)}%`,
                    backgroundColor: currentTheme.primary,
                  },
                ]}
              />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.goalEditButton, { backgroundColor: currentTheme.muted }]}
            onPress={openGoalModal}
            accessibilityLabel="Edit step goal"
          >
            <Pencil size={16} color={currentTheme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 7-Day Breakdown Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <TrendingUp size={24} color="#8b5cf6" />
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>7-Day Breakdown</Text>
            <Text style={styles.cardDescription}>
              Weekly total: {weeklySteps.toLocaleString()} steps
            </Text>
          </View>
        </View>

        <View style={styles.dataContainer}>
          {[...data].reverse().map(point => {
            const badge = getStepsBadge(point.steps);
            return (
              <View key={point.date} style={styles.dataRow}>
                <View style={styles.dayColumn}>
                  <Text style={styles.dayText}>{getDayLabel(point.date)}</Text>
                </View>

                <View style={styles.stepsColumn}>
                  <Footprints size={14} color={currentTheme.mutedForeground} />
                  <Text style={styles.stepsText}>{point.steps.toLocaleString()}</Text>
                </View>

                <View style={styles.stairsColumn}>
                  <TrendingUp size={14} color={currentTheme.mutedForeground} />
                  <Text style={styles.stepsText}>{point.stairsClimbed}</Text>
                </View>

                <View style={styles.caloriesColumn}>
                  <Flame size={14} color={currentTheme.mutedForeground} />
                  <Text style={styles.stepsText}>{point.caloriesBurned}</Text>
                </View>

                <View style={[styles.badge, { backgroundColor: badge.color }]}>
                  <Text style={styles.badgeText}>{badge.label}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Column headers */}
        <View style={[styles.dataRow, styles.columnHeaders]}>
          <View style={styles.dayColumn}>
            <Text style={styles.columnHeaderText}>Day</Text>
          </View>
          <View style={styles.stepsColumn}>
            <Text style={styles.columnHeaderText}>Steps</Text>
          </View>
          <View style={styles.stairsColumn}>
            <Text style={styles.columnHeaderText}>Flights</Text>
          </View>
          <View style={styles.caloriesColumn}>
            <Text style={styles.columnHeaderText}>kcal</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.columnHeaderText} />
          </View>
        </View>
      </View>

      {/* Insights Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>Fitness Insights</Text>
            <Text style={styles.cardDescription}>Tips based on your recent activity</Text>
          </View>
        </View>

        <View style={styles.insightsContainer}>
          <View style={[styles.insightCard, { backgroundColor: currentTheme.muted }]}>
            <Text style={[styles.insightTitle, { color: currentTheme.primary }]}>
              👟 Step Goal
            </Text>
            <Text style={[styles.insightText, { color: currentTheme.mutedForeground }]}>
              {weeklySteps >= stepGoal * 7
                ? `Excellent! You hit your ${stepGoal.toLocaleString()}-step goal every day this week (${weeklySteps.toLocaleString()} total).`
                : `You walked ${weeklySteps.toLocaleString()} steps this week. Aim for ${stepGoal.toLocaleString()} steps per day for best results.`}
            </Text>
          </View>

          <View style={[styles.insightCard, { backgroundColor: currentTheme.muted }]}>
            <Text style={[styles.insightTitle, { color: '#8b5cf6' }]}>
              🏃 During Pregnancy
            </Text>
            <Text style={[styles.insightText, { color: currentTheme.mutedForeground }]}>
              Gentle walking and light activity are recommended. Always consult your doctor before increasing intensity.
            </Text>
          </View>
        </View>
      </View>

      {/* Edit Step Goal Modal */}
      <Modal
        visible={showGoalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowGoalModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderContent}>
                  <Footprints size={24} color={currentTheme.primary} />
                  <Text style={styles.modalTitle}>Edit Step Goal</Text>
                </View>
                <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                  <X size={24} color={currentTheme.foreground} />
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Daily Step Goal</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`e.g., ${DEFAULT_STEP_GOAL}`}
                    value={goalInput}
                    onChangeText={setGoalInput}
                    keyboardType="number-pad"
                    placeholderTextColor={currentTheme.mutedForeground}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowGoalModal(false)}
                    disabled={savingGoal}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, savingGoal && styles.submitButtonDisabled]}
                    onPress={handleSaveGoal}
                    disabled={savingGoal}
                  >
                    <Text style={styles.submitButtonText}>
                      {savingGoal ? 'Saving...' : 'Save Goal'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    loadingText: {
      fontSize: 16,
      color: theme.mutedForeground,
      marginTop: 8,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.foreground,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.mutedForeground,
      textAlign: 'center',
      lineHeight: 22,
    },
    errorText: {
      fontSize: 15,
      color: '#ef4444',
      textAlign: 'center',
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: theme.primary,
      borderRadius: 20,
      marginTop: 8,
    },
    retryText: {
      color: theme.primaryForeground,
      fontWeight: '600',
      fontSize: 15,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: theme.foreground,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 12,
    },
    headerText: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.cardForeground,
    },
    cardDescription: {
      fontSize: 13,
      color: theme.mutedForeground,
      marginTop: 2,
    },
    summaryGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    summaryItem: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 6,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.cardForeground,
    },
    summaryLabel: {
      fontSize: 12,
      color: theme.mutedForeground,
    },
    goalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 16,
    },
    goalInfo: {
      flex: 1,
      gap: 6,
    },
    goalText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.cardForeground,
    },
    goalProgressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.muted,
      overflow: 'hidden',
    },
    goalProgressFill: {
      height: '100%',
      borderRadius: 3,
    },
    goalEditButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dataContainer: {
      gap: 2,
    },
    columnHeaders: {
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 6,
    },
    columnHeaderText: {
      fontSize: 11,
      color: theme.mutedForeground,
      fontWeight: '500',
    },
    dataRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: 8,
    },
    dayColumn: {
      flex: 2,
    },
    dayText: {
      fontSize: 13,
      color: theme.cardForeground,
      fontWeight: '500',
    },
    stepsColumn: {
      flex: 1.2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    stairsColumn: {
      flex: 0.8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    caloriesColumn: {
      flex: 0.8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    stepsText: {
      fontSize: 13,
      color: theme.mutedForeground,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      minWidth: 44,
      alignItems: 'center',
    },
    badgeText: {
      fontSize: 11,
      color: '#ffffff',
      fontWeight: '600',
    },
    insightsContainer: {
      gap: 12,
    },
    insightCard: {
      borderRadius: 10,
      padding: 14,
      gap: 6,
    },
    insightTitle: {
      fontSize: 14,
      fontWeight: '600',
    },
    insightText: {
      fontSize: 13,
      lineHeight: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalHeaderContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.foreground,
    },
    formContainer: {
      padding: 20,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      backgroundColor: theme.card,
      color: theme.cardForeground,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: theme.muted,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: theme.foreground,
      fontSize: 16,
      fontWeight: '600',
    },
    submitButton: {
      flex: 1,
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: theme.primaryForeground,
      fontSize: 16,
      fontWeight: '600',
    },
  });
