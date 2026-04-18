import themes from '@/constants/colors';
import { WHO_LENGTH_CM_RANGES, WHO_WEIGHT_KG_RANGES } from '@/constants/growthData';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useRouter } from 'expo-router';
import { Baby, BookHeart, Calendar, CalendarIcon, Heart, Pill, Ruler, Scale, Send, TrendingUp, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useEffect, useState } from 'react';
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
    View
} from 'react-native';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

interface WeightEntry {
  value: number;
  date: string;
}

interface HeightEntry {
  value: number;
  date: string;
}

interface BabyProfile {
  id: string;
  parentId: string;
  name: string;
  gender: string;
  birthday: string;
  createdAt: string;
  height: HeightEntry[];
  weight: WeightEntry[];
}

export default function Home() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const { session, user, selectedChildId, setSelectedChildId, refreshUser } = useAuth();
  const {notification, expoPushToken, error } = useNotification();
  const router = useRouter();
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiQuestion, setAiQuestion] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const styles = createStyles(currentTheme);

  useEffect(() => {
    const fetchBabyProfile = async () => {
      
      
      if (!session?.accessToken || !selectedChildId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/children/${selectedChildId}`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBabyProfile(data.profile || data);
        }
      } catch (err) {
        console.error('Failed to fetch baby profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBabyProfile();
  }, [session, selectedChildId]);

  const handleAddMeasurement = async () => {
    if (!weight && !height) {
      Alert.alert('Error', 'Please enter at least weight or height');
      return;
    }

    if (!session?.accessToken) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    const childId = selectedChildId || babyProfile?.id;
    if (!childId) {
      Alert.alert('Error', 'No child profile found');
      return;
    }

    setSubmitting(true);

    try {
      const dateISO = new Date(measurementDate).toISOString();

      const body: any = { date: dateISO };
      if (weight) body.weight = weight;
      if (height) body.height = height;

      const response = await fetch(`${API_BASE_URL}/children/${childId}/measurements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to add measurement');
      }

      // Refresh baby profile data
      const profileResponse = await fetch(`${API_BASE_URL}/children/${childId}`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });

      if (profileResponse.ok) {
        const data = await profileResponse.json();
        setBabyProfile(data.profile || data);
      }

      // Reset form
      setWeight('');
      setHeight('');
      setMeasurementDate(new Date().toISOString().split('T')[0]);
      setShowAddModal(false);

      Alert.alert('Success', 'Measurement added successfully!');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add measurement');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateAge = (birthday: string) => {
    const birthDate = new Date(birthday);
    const today = new Date();
    const diffMs = today.getTime() - birthDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const months = Math.floor(diffDays / 30.44);
    const years = Math.floor(diffDays / 365.25);

    if (years >= 1) {
      return `${years} year${years > 1 ? 's' : ''} old`;
    } else if (months >= 1) {
      return `${months} month${months > 1 ? 's' : ''} old`;
    } else {
      return `${weeks} week${weeks > 1 ? 's' : ''} old`;
    }
  };

  const getIdealRange = (birthday: string, gender: string) => {
    const birthDate = new Date(birthday);
    const today = new Date();
    const diffMs = today.getTime() - birthDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const months = Math.floor(diffDays / 30.44);

    const genderKey = gender.toLowerCase() === 'male' ? 'boy' : 'girl';
    const weightRanges = WHO_WEIGHT_KG_RANGES[genderKey as 'boy' | 'girl'];
    const heightRanges = WHO_LENGTH_CM_RANGES[genderKey as 'boy' | 'girl'];

    let weightRange = null;
    let heightRange = null;

    if (weeks <= 13) {
      const weightData = weightRanges.week.find((w: any) => w.week === weeks);
      const heightData = heightRanges.week.find((w: any) => w.week === weeks);
      weightRange = weightData ? { min: weightData.minKG, max: weightData.maxKG } : null;
      heightRange = heightData ? { min: heightData.minCM, max: heightData.maxCM } : null;
    } else {
      const weightData = weightRanges.month.find((m: any) => m.month === months);
      const heightData = heightRanges.month.find((m: any) => m.month === months);
      weightRange = weightData ? { min: weightData.minKG, max: weightData.maxKG } : null;
      heightRange = heightData ? { min: heightData.minCM, max: heightData.maxCM } : null;
    }

    return { weightRange, heightRange };
  };

  const userName = user?.FullName || user?.FirstName || 'Mom';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>Hello, {userName}!</Text>
          <Text style={styles.subGreeting}>Welcome to your motherhood journey</Text>
        </View>

        {/* Child Profile Card */}
        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator size="large" color={currentTheme.primary} />
          </View>
        ) : babyProfile ? (
          <TouchableOpacity
            style={styles.childCard}
            onPress={() => router.push('/healthTracker')}
            activeOpacity={0.7}
          >
            <View style={styles.childCardHeader}>
              <View style={styles.childIconContainer}>
                <Baby size={32} color={currentTheme.primary} />
              </View>
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{babyProfile.name}</Text>
                <Text style={styles.childAge}>{calculateAge(babyProfile.birthday)}</Text>
              </View>
              <Heart size={24} color={currentTheme.destructive} fill={currentTheme.destructive} />
            </View>

            <View style={styles.divider} />

            <View style={styles.childStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Ideal Weight</Text>
                <Text style={styles.statValue}>
                  {(() => {
                    const { weightRange } = getIdealRange(babyProfile.birthday, babyProfile.gender);
                    return weightRange ? `${weightRange.min}-${weightRange.max} kg` : 'N/A';
                  })()}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Ideal Height</Text>
                <Text style={styles.statValue}>
                  {(() => {
                    const { heightRange } = getIdealRange(babyProfile.birthday, babyProfile.gender);
                    return heightRange ? `${heightRange.min}-${heightRange.max} cm` : 'N/A';
                  })()}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Growth Details Card */}
        {babyProfile && (
          <View style={styles.growthDetailsCard}>
            <View style={styles.growthDetailsHeader}>
              <Text style={styles.growthDetailsTitle}>Growth Details</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.updateRecordText}>Update Record</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.growthDetailsContent}>
              <View style={styles.growthDetailItem}>
                <View style={styles.growthDetailIconContainer}>
                  <Scale size={20} color={currentTheme.primary} />
                </View>
                <View style={styles.growthDetailInfo}>
                  <Text style={styles.growthDetailLabel}>Current Weight</Text>
                  <Text style={styles.growthDetailValue}>
                    {babyProfile.weight && babyProfile.weight.length > 0
                      ? `${babyProfile.weight[babyProfile.weight.length - 1].value} kg`
                      : 'No data'}
                  </Text>
                </View>
              </View>

              <View style={styles.growthDetailDivider} />

              <View style={styles.growthDetailItem}>
                <View style={styles.growthDetailIconContainer}>
                  <Ruler size={20} color={currentTheme.primary} />
                </View>
                <View style={styles.growthDetailInfo}>
                  <Text style={styles.growthDetailLabel}>Current Height</Text>
                  <Text style={styles.growthDetailValue}>
                    {babyProfile.height && babyProfile.height.length > 0
                      ? `${babyProfile.height[babyProfile.height.length - 1].value} cm`
                      : 'No data'}
                  </Text>
                </View>
              </View>
            </View>

            {(babyProfile.weight.length > 0 || babyProfile.height.length > 0) && (
              <View style={styles.lastUpdatedContainer}>
                <Calendar size={14} color={currentTheme.mutedForeground} />
                <Text style={styles.lastUpdatedText}>
                  Last updated:{' '}
                  {(() => {
                    const lastWeightDate = babyProfile.weight.length > 0
                      ? new Date(babyProfile.weight[babyProfile.weight.length - 1].date)
                      : null;
                    const lastHeightDate = babyProfile.height.length > 0
                      ? new Date(babyProfile.height[babyProfile.height.length - 1].date)
                      : null;

                    let lastDate = lastWeightDate;
                    if (lastHeightDate && (!lastWeightDate || lastHeightDate > lastWeightDate)) {
                      lastDate = lastHeightDate;
                    }

                    return lastDate
                      ? lastDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                      : 'N/A';
                  })()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* AI Question Section */}
        <View style={styles.aiQuestionSection}>
          <Text style={styles.aiSectionTitle}>AI Support</Text>
          <Text style={styles.aiSectionSubtitle}>Get instant answers to your parenting questions</Text>
          <View style={styles.aiQuestionCard}>
            <TextInput
              style={styles.aiQuestionInput}
              placeholder="Ask me anything about parenting..."
              placeholderTextColor={currentTheme.mutedForeground}
              value={aiQuestion}
              onChangeText={setAiQuestion}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.aiSubmitButton}
              onPress={() => {
                if (aiQuestion.trim()) {
                  router.push({
                    pathname: '/(tabs)/aiSupport',
                    params: { question: aiQuestion }
                  });
                  setAiQuestion('');
                }
              }}
              activeOpacity={0.7}
            >
              <Send size={20} color={currentTheme.primaryForeground} />
              <Text style={styles.aiSubmitButtonText}>Ask AI</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Features Cards */}
        <View style={styles.featuresRow}>
          <TouchableOpacity
            style={styles.featureCardSmall}
            onPress={() => router.push('/privateJournal')}
            activeOpacity={0.7}
          >
            <View style={styles.featureIconContainerSmall}>
              <BookHeart size={28} color={currentTheme.primary} />
            </View>
            <Text style={styles.featureTitleSmall}>Private Journal</Text>
            <Text style={styles.featureDescriptionSmall}>
              Document your motherhood journey
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCardSmall}
            onPress={() => router.push('/healthTracker')}
            activeOpacity={0.7}
          >
            <View style={styles.featureIconContainerSmall}>
              <TrendingUp size={28} color={currentTheme.primary} />
            </View>
            <Text style={styles.featureTitleSmall}>Health Tracker</Text>
            <Text style={styles.featureDescriptionSmall}>
              Monitor your baby's growth
            </Text>
          </TouchableOpacity>
        </View>

        {/* Medication Reminders Card */}
        <View style={styles.featuresRow}>
          <TouchableOpacity
            style={styles.featureCardSmall}
            onPress={() => router.push('/medications')}
            activeOpacity={0.7}
          >
            <View style={styles.featureIconContainerSmall}>
              <Pill size={28} color={currentTheme.primary} />
            </View>
            <Text style={styles.featureTitleSmall}>Medication Reminders</Text>
            <Text style={styles.featureDescriptionSmall}>
              Track your medications and dosages
            </Text>
          </TouchableOpacity>

          <View style={styles.featureCardSmall} />
        </View>
      </ScrollView>

      {/* Add Measurement Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Measurement</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X size={24} color={currentTheme.foreground} />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <ScrollView
                style={styles.formContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <View style={styles.inputWithIcon}>
                    <Scale size={20} color={currentTheme.mutedForeground} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g., 5.5"
                      value={weight}
                      onChangeText={setWeight}
                      keyboardType="decimal-pad"
                      placeholderTextColor={currentTheme.mutedForeground}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <View style={styles.inputWithIcon}>
                    <Ruler size={20} color={currentTheme.mutedForeground} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g., 65"
                      value={height}
                      onChangeText={setHeight}
                      keyboardType="decimal-pad"
                      placeholderTextColor={currentTheme.mutedForeground}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowCalendar(!showCalendar)}
                  >
                    <CalendarIcon size={20} color={currentTheme.mutedForeground} />
                    <Text style={styles.dateButtonText}>
                      {new Date(measurementDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </TouchableOpacity>
                  {showCalendar && (
                    <RNCalendar
                      current={measurementDate}
                      onDayPress={(day) => {
                        setMeasurementDate(day.dateString);
                        setShowCalendar(false);
                      }}
                      maxDate={new Date().toISOString().split('T')[0]}
                      theme={{
                        backgroundColor: currentTheme.card,
                        calendarBackground: currentTheme.card,
                        textSectionTitleColor: currentTheme.mutedForeground,
                        selectedDayBackgroundColor: currentTheme.primary,
                        selectedDayTextColor: currentTheme.primaryForeground,
                        todayTextColor: currentTheme.primary,
                        dayTextColor: currentTheme.cardForeground,
                        textDisabledColor: currentTheme.mutedForeground,
                        monthTextColor: currentTheme.cardForeground,
                        arrowColor: currentTheme.primary,
                      }}
                      style={styles.calendar}
                    />
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowAddModal(false)}
                    disabled={submitting}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleAddMeasurement}
                    disabled={submitting}
                  >
                    <Text style={styles.submitButtonText}>
                      {submitting ? 'Adding...' : 'Add Measurement'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 20,
  },
  greetingSection: {
    paddingTop: 24,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.foreground,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: theme.mutedForeground,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: theme.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  childCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: theme.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  childCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  childIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.cardForeground,
    marginBottom: 4,
  },
  childAge: {
    fontSize: 15,
    color: theme.mutedForeground,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginBottom: 16,
  },
  childStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: theme.mutedForeground,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.primary,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.border,
    marginHorizontal: 16,
  },
  growthDetailsCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: theme.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  growthDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  growthDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.cardForeground,
  },
  updateRecordText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },
  growthDetailsContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  growthDetailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  growthDetailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  growthDetailInfo: {
    flex: 1,
  },
  growthDetailLabel: {
    fontSize: 12,
    color: theme.mutedForeground,
    marginBottom: 4,
  },
  growthDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.cardForeground,
  },
  growthDetailDivider: {
    width: 1,
    backgroundColor: theme.border,
    marginHorizontal: 16,
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: theme.mutedForeground,
  },
  aiQuestionSection: {
    marginBottom: 20,
  },
  aiSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.foreground,
    marginBottom: 4,
  },
  aiSectionSubtitle: {
    fontSize: 14,
    color: theme.mutedForeground,
    marginBottom: 12,
  },
  aiQuestionCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: theme.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  aiQuestionInput: {
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: theme.foreground,
    minHeight: 80,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  aiSubmitButton: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  aiSubmitButtonText: {
    color: theme.primaryForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 24,
  },
  featureCardSmall: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: theme.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIconContainerSmall: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: theme.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitleSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.cardForeground,
    marginBottom: 6,
  },
  featureDescriptionSmall: {
    fontSize: 13,
    color: theme.mutedForeground,
    lineHeight: 18,
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
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.card,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: theme.cardForeground,
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
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.cardForeground,
  },
  genderButtonTextActive: {
    color: theme.primaryForeground,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.card,
  },
  dateButtonText: {
    fontSize: 16,
    color: theme.cardForeground,
  },
  calendar: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
