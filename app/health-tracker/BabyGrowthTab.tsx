import themes from '@/constants/colors';
import { WHO_LENGTH_CM_RANGES, WHO_WEIGHT_KG_RANGES } from '@/constants/growthData';
import { useAuth } from '@/context/AuthContext';
import { Baby, CalendarIcon, Plus, Ruler, Scale, X } from 'lucide-react-native';
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
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

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

export default function BabyGrowthTab() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const { session, user } = useAuth();
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [measurementType, setMeasurementType] = useState<'weight' | 'height' | 'both'>('both');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMeasurementCalendar, setShowMeasurementCalendar] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Create profile state
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileGender, setProfileGender] = useState('Male');
  const [profileBirthday, setProfileBirthday] = useState('');
  const [showBirthdayCalendar, setShowBirthdayCalendar] = useState(false);
  const [profileBirthWeight, setProfileBirthWeight] = useState('');
  const [profileBirthHeight, setProfileBirthHeight] = useState('');
  const [creatingProfile, setCreatingProfile] = useState(false);

  const styles = createStyles(currentTheme);

  useEffect(() => {
    const fetchBabyProfile = async () => {
      if (!session?.accessToken) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      try {
        // Get childId from user profile
        const childId = user?.childId;

        if (!childId) {
          setError('No baby profile selected');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/children/${childId}`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch baby profile');
        }

        const data = await response.json();
        setBabyProfile(data.profile || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchBabyProfile();
  }, [session, user]);

  const handleCreateProfile = async () => {
    if (!profileName || !profileBirthday || !profileBirthWeight || !profileBirthHeight) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!session?.accessToken) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    setCreatingProfile(true);

    try {
      const birthdayISO = new Date(profileBirthday).toISOString();

      const body = {
        name: profileName,
        birthday: birthdayISO,
        birthWeight: profileBirthWeight,
        birthHeight: profileBirthHeight,
        gender: profileGender,
      };

      const response = await fetch(`${API_BASE_URL}/children`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to create profile');
      }

      const data = await response.json();
      setBabyProfile(data.profile);
      setShowCreateProfile(false);
      setError(null);

      Alert.alert('Success', data.message || 'Child profile created successfully!');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleAddMeasurement = async () => {
    if (!weight && !height) {
      Alert.alert('Error', 'Please enter at least weight or height');
      return;
    }

    if (!session?.accessToken) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    const childId = user?.childId || babyProfile?.id;
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

  const renderContent = () => {
    if (loading) {
      return (
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={currentTheme.primary} />
          <Text style={styles.loadingText}>Loading growth data...</Text>
        </View>
      );
    }

    if (error || !babyProfile) {
      return (
        <View style={[styles.container, styles.centerContent]}>
          <Baby size={64} color={currentTheme.mutedForeground} />
          <Text style={styles.errorText}>{error || 'No child profile found'}</Text>
          <Text style={styles.errorSubtext}>Create a profile to start tracking growth</Text>
          <TouchableOpacity
            style={styles.createProfileButton}
            onPress={() => setShowCreateProfile(true)}
          >
            <Plus size={20} color={currentTheme.primaryForeground} />
            <Text style={styles.createProfileButtonText}>Create Child Profile</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return renderBabyProfile();
  };

  const renderBabyProfile = () => {
    if (!babyProfile) return null;

    // Calculate baby's age in weeks/months
    const calculateAge = (birthday: string, measurementDate: string) => {
      const birthDate = new Date(birthday);
      const measDate = new Date(measurementDate);
      const diffMs = measDate.getTime() - birthDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const weeks = Math.floor(diffDays / 7);
      const months = Math.floor(diffDays / 30.44); // Average days per month

      return { weeks, months, days: diffDays };
    };

    // Get ideal range based on age and gender
    const getIdealWeightRange = (weeks: number, months: number, gender: string) => {
      const genderKey = gender.toLowerCase() === 'male' ? 'boy' : 'girl';
      const ranges = WHO_WEIGHT_KG_RANGES[genderKey as 'boy' | 'girl'];

      if (weeks <= 13) {
        const weekData = ranges.week.find((w: any) => w.week === weeks);
        return weekData ? { min: weekData.minKG, max: weekData.maxKG } : null;
      } else {
        const monthData = ranges.month.find((m: any) => m.month === months);
        return monthData ? { min: monthData.minKG, max: monthData.maxKG } : null;
      }
    };

    const getIdealHeightRange = (weeks: number, months: number, gender: string) => {
      const genderKey = gender.toLowerCase() === 'male' ? 'boy' : 'girl';
      const ranges = WHO_LENGTH_CM_RANGES[genderKey as 'boy' | 'girl'];

      if (weeks <= 13) {
        const weekData = ranges.week.find((w: any) => w.week === weeks);
        return weekData ? { min: weekData.minCM, max: weekData.maxCM } : null;
      } else {
        const monthData = ranges.month.find((m: any) => m.month === months);
        return monthData ? { min: monthData.minCM, max: monthData.maxCM } : null;
      }
    };

    // Check if value is within range
    const isInRange = (value: number, range: { min: number; max: number } | null) => {
      if (!range) return true;
      return value >= range.min && value <= range.max;
    };

    // Sort weight and height by date
    const sortedWeight = [...babyProfile.weight].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const sortedHeight = [...babyProfile.height].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Get first and last entries for summary
    const firstWeight = sortedWeight[0];
    const lastWeight = sortedWeight[sortedWeight.length - 1];
    const firstHeight = sortedHeight[0];
    const lastHeight = sortedHeight[sortedHeight.length - 1];

    const weightGain = lastWeight && firstWeight ? lastWeight.value - firstWeight.value : 0;
    const heightGrowth = lastHeight && firstHeight ? lastHeight.value - firstHeight.value : 0;

    // Format date for display
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Format age display
    const formatAge = (weeks: number, months: number) => {
      if (weeks <= 13) {
        return `${weeks}w`;
      } else {
        return `${months}m`;
      }
    };

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Baby Info Header */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Baby size={24} color={currentTheme.primary} />
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>{babyProfile.name}'s Growth</Text>
              <Text style={styles.cardDescription}>
                Born: {formatDate(babyProfile.birthday)}
              </Text>
            </View>
          </View>
        </View>

        {/* Weight Records Table */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Scale size={20} color={currentTheme.primary} />
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>Weight Records</Text>
            </View>
            <TouchableOpacity
              style={styles.addTextButton}
              onPress={() => {
                setMeasurementType('weight');
                setShowAddModal(true);
              }}
            >
              <Text style={styles.addTextButtonText}>Add Record</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardContent}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Date</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Age</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Weight</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Ideal Range</Text>
            </View>

            {/* Table Rows */}
            <View style={styles.dataContainer}>
              {sortedWeight.map((entry, index) => {
                const age = calculateAge(babyProfile.birthday, entry.date);
                const idealRange = getIdealWeightRange(age.weeks, age.months, babyProfile.gender);
                const inRange = isInRange(entry.value, idealRange);

                return (
                  <View key={`weight-${entry.date}-${index}`} style={styles.tableRow}>
                    <Text style={[styles.tableCellText, { flex: 1.2 }]}>
                      {formatDate(entry.date)}
                    </Text>
                    <Text style={[styles.tableCellText, { flex: 0.8 }]}>
                      {formatAge(age.weeks, age.months)}
                    </Text>
                    <Text style={[styles.tableCellValue, { flex: 1, color: inRange ? currentTheme.cardForeground : currentTheme.destructive }]}>
                      {entry.value} kg
                    </Text>
                    <Text style={[styles.tableCellRange, { flex: 1.5 }]}>
                      {idealRange ? `${idealRange.min}-${idealRange.max} kg` : 'N/A'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Height Records Table */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ruler size={20} color={currentTheme.primary} />
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>Height Records</Text>
            </View>
            <TouchableOpacity
              style={styles.addTextButton}
              onPress={() => {
                setMeasurementType('height');
                setShowAddModal(true);
              }}
            >
              <Text style={styles.addTextButtonText}>Add Record</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardContent}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Date</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Age</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Height</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Ideal Range</Text>
            </View>

            {/* Table Rows */}
            <View style={styles.dataContainer}>
              {sortedHeight.map((entry, index) => {
                const age = calculateAge(babyProfile.birthday, entry.date);
                const idealRange = getIdealHeightRange(age.weeks, age.months, babyProfile.gender);
                const inRange = isInRange(entry.value, idealRange);

                return (
                  <View key={`height-${entry.date}-${index}`} style={styles.tableRow}>
                    <Text style={[styles.tableCellText, { flex: 1.2 }]}>
                      {formatDate(entry.date)}
                    </Text>
                    <Text style={[styles.tableCellText, { flex: 0.8 }]}>
                      {formatAge(age.weeks, age.months)}
                    </Text>
                    <Text style={[styles.tableCellValue, { flex: 1, color: inRange ? currentTheme.cardForeground : currentTheme.destructive }]}>
                      {entry.value} cm
                    </Text>
                    <Text style={[styles.tableCellRange, { flex: 1.5 }]}>
                      {idealRange ? `${idealRange.min}-${idealRange.max} cm` : 'N/A'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Growth Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Growth Summary</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Birth Weight</Text>
                <Text style={styles.summaryValue}>
                  {firstWeight ? `${firstWeight.value} kg` : '-'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Current Weight</Text>
                <Text style={styles.summaryValue}>
                  {lastWeight ? `${lastWeight.value} kg` : '-'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Weight Gain</Text>
                <Text style={[styles.summaryValue, { color: currentTheme.primary }]}>
                  {weightGain > 0 ? `+${weightGain.toFixed(1)} kg` : '-'}
                </Text>
              </View>
            </View>

            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Birth Height</Text>
                <Text style={styles.summaryValue}>
                  {firstHeight ? `${firstHeight.value} cm` : '-'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Current Height</Text>
                <Text style={styles.summaryValue}>
                  {lastHeight ? `${lastHeight.value} cm` : '-'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Growth</Text>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                  {heightGrowth > 0 ? `+${heightGrowth.toFixed(1)} cm` : '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <>
      {renderContent()}

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
                <View style={styles.modalHeaderContent}>
                  {measurementType === 'weight' && <Scale size={24} color={currentTheme.primary} />}
                  {measurementType === 'height' && <Ruler size={24} color={currentTheme.primary} />}
                  {measurementType === 'both' && <Baby size={24} color={currentTheme.primary} />}
                  <Text style={styles.modalTitle}>
                    {measurementType === 'weight' ? 'Add Weight' :
                      measurementType === 'height' ? 'Add Height' :
                        'Add Measurement'}
                  </Text>
                </View>
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
                {(measurementType === 'weight' || measurementType === 'both') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Weight (kg) {measurementType === 'both' ? '' : '*'}</Text>
                    <View style={styles.inputWithIcon}>
                      <Scale size={20} color={currentTheme.mutedForeground} />
                      <TextInput
                        style={styles.inputWithIconField}
                        placeholder="e.g., 5.5"
                        value={weight}
                        onChangeText={setWeight}
                        keyboardType="decimal-pad"
                        placeholderTextColor={currentTheme.mutedForeground}
                      />
                    </View>
                  </View>
                )}

                {(measurementType === 'height' || measurementType === 'both') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Height (cm) {measurementType === 'both' ? '' : '*'}</Text>
                    <View style={styles.inputWithIcon}>
                      <Ruler size={20} color={currentTheme.mutedForeground} />
                      <TextInput
                        style={styles.inputWithIconField}
                        placeholder="e.g., 65"
                        value={height}
                        onChangeText={setHeight}
                        keyboardType="decimal-pad"
                        placeholderTextColor={currentTheme.mutedForeground}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowMeasurementCalendar(!showMeasurementCalendar)}
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
                  {showMeasurementCalendar && (
                    <Calendar
                      current={measurementDate}
                      onDayPress={(day) => {
                        setMeasurementDate(day.dateString);
                        setShowMeasurementCalendar(false);
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
                    {measurementType === 'weight' && <Scale size={20} color={currentTheme.primaryForeground} />}
                    {measurementType === 'height' && <Ruler size={20} color={currentTheme.primaryForeground} />}
                    <Text style={styles.submitButtonText}>
                      {submitting ? 'Adding...' :
                        measurementType === 'weight' ? 'Add Weight' :
                          measurementType === 'height' ? 'Add Height' :
                            'Add Measurement'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Profile Modal */}
      <Modal
        visible={showCreateProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateProfile(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCreateProfile(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Child Profile</Text>
                <TouchableOpacity onPress={() => setShowCreateProfile(false)}>
                  <X size={24} color={currentTheme.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.formContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your child name"
                    value={profileName}
                    onChangeText={setProfileName}
                    placeholderTextColor={currentTheme.mutedForeground}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Gender *</Text>
                  <View style={styles.genderContainer}>
                    <TouchableOpacity
                      style={[
                        styles.genderButton,
                        profileGender === 'Male' && styles.genderButtonActive,
                      ]}
                      onPress={() => setProfileGender('Male')}
                    >
                      <Text
                        style={[
                          styles.genderButtonText,
                          profileGender === 'Male' && styles.genderButtonTextActive,
                        ]}
                      >
                        Boy
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.genderButton,
                        profileGender === 'Female' && styles.genderButtonActive,
                      ]}
                      onPress={() => setProfileGender('Female')}
                    >
                      <Text
                        style={[
                          styles.genderButtonText,
                          profileGender === 'Female' && styles.genderButtonTextActive,
                        ]}
                      >
                        Girl
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Birthday *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowBirthdayCalendar(!showBirthdayCalendar)}
                  >
                    <CalendarIcon size={20} color={currentTheme.mutedForeground} />
                    <Text style={styles.dateButtonText}>
                      {profileBirthday
                        ? new Date(profileBirthday).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                        : 'Select birthday'}
                    </Text>
                  </TouchableOpacity>
                  {showBirthdayCalendar && (
                    <Calendar
                      current={profileBirthday || new Date().toISOString().split('T')[0]}
                      onDayPress={(day) => {
                        setProfileBirthday(day.dateString);
                        setShowBirthdayCalendar(false);
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

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Birth Weight (kg) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 3.4"
                    value={profileBirthWeight}
                    onChangeText={setProfileBirthWeight}
                    keyboardType="decimal-pad"
                    placeholderTextColor={currentTheme.mutedForeground}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Birth Height (cm) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 50"
                    value={profileBirthHeight}
                    onChangeText={setProfileBirthHeight}
                    keyboardType="decimal-pad"
                    placeholderTextColor={currentTheme.mutedForeground}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowCreateProfile(false)}
                    disabled={creatingProfile}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, creatingProfile && styles.submitButtonDisabled]}
                    onPress={handleCreateProfile}
                    disabled={creatingProfile}
                  >
                    <Text style={styles.submitButtonText}>
                      {creatingProfile ? 'Creating...' : 'Create Profile'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.mutedForeground,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.foreground,
    textAlign: 'center',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: theme.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  createProfileButtonText: {
    color: theme.primaryForeground,
    fontSize: 16,
    fontWeight: '600',
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
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: theme.foreground,
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.mutedForeground,
  },
  cardContent: {
    flex: 1,
  },
  dataContainer: {
    gap: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: theme.muted,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.mutedForeground,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    alignItems: 'center',
  },
  tableCellText: {
    fontSize: 12,
    color: theme.cardForeground,
    textAlign: 'center',
  },
  tableCellValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableCellRange: {
    fontSize: 11,
    color: theme.mutedForeground,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.mutedForeground,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.cardForeground,
  },
  addButton: {
    backgroundColor: theme.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTextButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  addTextButtonText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '600',
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
  inputWithIconField: {
    flex: 1,
    fontSize: 16,
    color: theme.cardForeground,
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
    flexDirection: 'row',
    gap: 8,
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
});