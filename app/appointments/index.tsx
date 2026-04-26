import themes from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar as CalendarIcon, CalendarPlus, ChevronDown, Plus, Stethoscope, X } from 'lucide-react-native';
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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

type AppointmentType = 'doctor' | 'lab' | 'physiotherapy' | 'dietitian' | 'mental_wellness';

interface Appointment {
  id: string;
  userId: string;
  date: string;
  type?: AppointmentType;
  fastingRequired?: boolean;
  doctor?: string;
  notes?: string;
  medications?: string[];
  followUp?: string;
  documents?: string[];
  exercises?: string[];
  painScore?: number;
  dietPlan?: string;
  isFollowUp?: boolean;
  parentAppointmentId?: string;
  isCancelled?: boolean;
  isRescheduled?: boolean;
  createdAt: string;
  updatedAt?: string;
}

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      // Legacy non-JSON string, fallback to comma-separated parsing.
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeAppointment = (appointment: any): Appointment => ({
  ...appointment,
  medications: normalizeStringArray(appointment?.medications),
  exercises: normalizeStringArray(appointment?.exercises),
});

export default function AppointmentsScreen() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const { session } = useAuth();
  const router = useRouter();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add appointment modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [doctorName, setDoctorName] = useState('');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('doctor');
  const [fastingRequired, setFastingRequired] = useState(false);
  const [showDateCalendar, setShowDateCalendar] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit appointment modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editDate, setEditDate] = useState('');
  const [showEditDateCalendar, setShowEditDateCalendar] = useState(false);
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState<string[]>([]);
  const [currentMedication, setCurrentMedication] = useState('');
  const [exercises, setExercises] = useState<string[]>([]);
  const [currentExercise, setCurrentExercise] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [showFollowUpCalendar, setShowFollowUpCalendar] = useState(false);
  const [painScore, setPainScore] = useState('');
  const [dietPlan, setDietPlan] = useState('');
  const [editFastingRequired, setEditFastingRequired] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [updating, setUpdating] = useState(false);

  const styles = createStyles(currentTheme);

  const fetchAppointments = useCallback(async () => {
    if (!session?.accessToken) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/appointment`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const data = await response.json();
      const rawAppointments = data.appointments || data || [];
      const normalizedAppointments = Array.isArray(rawAppointments)
        ? rawAppointments.map(normalizeAppointment)
        : [];
      setAppointments(normalizedAppointments);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleAddAppointment = async () => {
    if (!appointmentDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    if (!session?.accessToken) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    setSubmitting(true);

    try {
      const dateISO = new Date(appointmentDate).toISOString();

      const body: any = { 
        date: dateISO,
        type: appointmentType
      };
      if (doctorName.trim()) {
        body.doctor = doctorName.trim();
      }
      if (fastingRequired) {
        body.fastingRequired = true;
      }

      const response = await fetch(`${API_BASE_URL}/appointment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to create appointment');
      }

      // Refresh appointments list
      await fetchAppointments();

      // Reset form
      setAppointmentDate(new Date().toISOString().split('T')[0]);
      setDoctorName('');
      setAppointmentType('doctor');
      setFastingRequired(false);
      setShowAddModal(false);

      Alert.alert('Success', 'Appointment added successfully!');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment) return;

    if (!session?.accessToken) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    setUpdating(true);

    try {
      const formData = new FormData();

      // Auto-detect rescheduling
      const originalDate = selectedAppointment.date.split('T')[0];
      const dateChanged = editDate !== originalDate;
      if (dateChanged) {
        formData.append('date', new Date(editDate).toISOString());
        formData.append('isRescheduled', 'true');
      }

      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }
      if (medications.length > 0) {
        formData.append('medications', JSON.stringify(medications));
      }
      if (exercises.length > 0) {
        formData.append('exercises', JSON.stringify(exercises));
      }
      if (followUpDate) {
        formData.append('followUp', new Date(followUpDate).toISOString());
      }
      if (painScore) {
        formData.append('painScore', painScore);
      }
      if (dietPlan.trim()) {
        formData.append('dietPlan', dietPlan.trim());
      }
      formData.append('fastingRequired', editFastingRequired.toString());
      formData.append('isCancelled', isCancelled.toString());

      const response = await fetch(`${API_BASE_URL}/appointment/${selectedAppointment.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment');
      }

      const data = await response.json();

      // Refresh appointments list
      await fetchAppointments();

      // Reset form
      setNotes('');
      setMedications([]);
      setExercises([]);
      setFollowUpDate('');
      setPainScore('');
      setDietPlan('');
      setEditFastingRequired(false);
      setIsCancelled(false);
      setEditDate('');
      setSelectedAppointment(null);
      setShowEditModal(false);

      let message = 'Appointment updated successfully!';
      if (data.followUpAppointmentId) {
        message += ' Follow-up appointment created.';
      }
      Alert.alert('Success', message);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update appointment');
    } finally {
      setUpdating(false);
    }
  };

  const openEditModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditDate(appointment.date.split('T')[0]);
    setNotes(appointment.notes || '');
    setMedications(normalizeStringArray(appointment.medications));
    setExercises(normalizeStringArray(appointment.exercises));
    setFollowUpDate(appointment.followUp || '');
    setPainScore(appointment.painScore?.toString() || '');
    setDietPlan(appointment.dietPlan || '');
    setEditFastingRequired(appointment.fastingRequired || false);
    setIsCancelled(appointment.isCancelled || false);
    setShowEditModal(true);
  };

  const addMedication = () => {
    if (currentMedication.trim()) {
      setMedications([...medications, currentMedication.trim()]);
      setCurrentMedication('');
    }
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const addExercise = () => {
    if (currentExercise.trim()) {
      setExercises([...exercises, currentExercise.trim()]);
      setCurrentExercise('');
    }
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const shouldShowField = (field: 'medications' | 'exercises' | 'painScore' | 'dietPlan') => {
    const type = selectedAppointment?.type;
    if (!type) return true; // no type = show all
    switch (field) {
      case 'medications':
        return type === 'doctor' || type === 'mental_wellness';
      case 'exercises':
        return type === 'physiotherapy' || type === 'mental_wellness';
      case 'painScore':
        return type === 'physiotherapy';
      case 'dietPlan':
        return type === 'dietitian';
    }
  };

  const getAppointmentTypeLabel = (type?: AppointmentType) => {
    if (!type) return null;
    const labels: Record<AppointmentType, string> = {
      doctor: 'Doctor',
      lab: 'Lab',
      physiotherapy: 'Physiotherapy',
      dietitian: 'Dietitian',
      mental_wellness: 'Mental Wellness',
    };
    return labels[type];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      weekday: 'short'
    });
  };

  const sortedAppointments = [...appointments].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <CalendarPlus size={28} color={currentTheme.primary} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Appointments</Text>
            <Text style={styles.headerSubtitle}>Track your medical appointments</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={24} color={currentTheme.primaryForeground} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={currentTheme.primary} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Appointments List */}
          {error ? (
            <View style={styles.emptyState}>
              <CalendarPlus size={64} color={currentTheme.mutedForeground} />
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : sortedAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarPlus size={64} color={currentTheme.mutedForeground} />
              <Text style={styles.emptyText}>No appointments yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first appointment to get started
              </Text>
            </View>
          ) : (
            sortedAppointments.map((appointment) => (
              <TouchableOpacity
                key={appointment.id}
                style={styles.appointmentCard}
                onPress={() => openEditModal(appointment)}
              >
                <View style={styles.appointmentHeader}>
                  <View style={styles.dateContainer}>
                    <CalendarIcon size={20} color={currentTheme.primary} />
                    <Text style={styles.appointmentDate}>
                      {formatDate(appointment.date)}
                    </Text>
                  </View>
                  <View style={styles.badgesContainer}>
                    {appointment.type && (
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{getAppointmentTypeLabel(appointment.type)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Status Tags */}
                <View style={styles.statusTagsContainer}>
                  {appointment.isFollowUp && (
                    <View style={[styles.statusTag, styles.followUpTag]}>
                      <Text style={styles.statusTagText}>Follow Up</Text>
                    </View>
                  )}
                  {appointment.isCancelled && (
                    <View style={[styles.statusTag, styles.cancelledTag]}>
                      <Text style={styles.statusTagText}>Cancelled</Text>
                    </View>
                  )}
                  {appointment.isRescheduled && (
                    <View style={[styles.statusTag, styles.rescheduledTag]}>
                      <Text style={styles.statusTagText}>Rescheduled</Text>
                    </View>
                  )}
                </View>

                {appointment.doctor && (
                  <View style={styles.appointmentDetail}>
                    <Stethoscope size={16} color={currentTheme.mutedForeground} />
                    <Text style={styles.appointmentDetailText}>
                      Dr. {appointment.doctor}
                    </Text>
                  </View>
                )}

                {appointment.fastingRequired && (
                  <View style={styles.appointmentDetail}>
                    <Text style={styles.fastingText}>⚠️ Fasting Required</Text>
                  </View>
                )}

                {appointment.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText} numberOfLines={2}>
                      {appointment.notes}
                    </Text>
                  </View>
                )}

                {normalizeStringArray(appointment.medications).length > 0 && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Medications:</Text>
                    <Text style={styles.notesText} numberOfLines={2}>
                      {normalizeStringArray(appointment.medications).join(', ')}
                    </Text>
                  </View>
                )}

                {normalizeStringArray(appointment.exercises).length > 0 && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Exercises:</Text>
                    <Text style={styles.notesText} numberOfLines={2}>
                      {normalizeStringArray(appointment.exercises).join(', ')}
                    </Text>
                  </View>
                )}

                {appointment.painScore !== undefined && (
                  <View style={styles.appointmentDetail}>
                    <Text style={styles.appointmentDetailText}>
                      Pain Score: {appointment.painScore}/10
                    </Text>
                  </View>
                )}

                {appointment.dietPlan && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Diet Plan:</Text>
                    <Text style={styles.notesText} numberOfLines={2}>
                      {appointment.dietPlan}
                    </Text>
                  </View>
                )}

                {appointment.followUp && (
                  <View style={styles.appointmentDetail}>
                    <Text style={styles.followUpText}>
                      📅 Follow-up: {formatDate(appointment.followUp)}
                    </Text>
                  </View>
                )}

                {!appointment.notes && !normalizeStringArray(appointment.medications).length && !normalizeStringArray(appointment.exercises).length && (
                  <Text style={styles.tapToAddText}>Tap to add details</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Add Appointment Modal */}
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
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderContent}>
                  <CalendarPlus size={24} color={currentTheme.primary} />
                  <Text style={styles.modalTitle}>Add Appointment</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X size={24} color={currentTheme.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.formContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDateCalendar(!showDateCalendar)}
                  >
                    <CalendarIcon size={20} color={currentTheme.mutedForeground} />
                    <Text style={styles.dateButtonText}>
                      {new Date(appointmentDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </TouchableOpacity>
                  {showDateCalendar && (
                    <Calendar
                      current={appointmentDate}
                      onDayPress={(day) => {
                        setAppointmentDate(day.dateString);
                        setShowDateCalendar(false);
                      }}
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
                  <Text style={styles.inputLabel}>Doctor Name (Optional)</Text>
                  <View style={styles.inputWithIcon}>
                    <Stethoscope size={20} color={currentTheme.mutedForeground} />
                    <TextInput
                      style={styles.inputWithIconField}
                      placeholder="e.g., Smith"
                      value={doctorName}
                      onChangeText={setDoctorName}
                      placeholderTextColor={currentTheme.mutedForeground}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Appointment Type *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                  >
                    <Text style={styles.dateButtonText}>
                      {getAppointmentTypeLabel(appointmentType)}
                    </Text>
                    <ChevronDown size={20} color={currentTheme.mutedForeground} />
                  </TouchableOpacity>
                  {showTypeDropdown && (
                    <View style={styles.dropdown}>
                      {['doctor', 'lab', 'physiotherapy', 'dietitian', 'mental_wellness'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setAppointmentType(type as AppointmentType);
                            setShowTypeDropdown(false);
                            if (type !== 'lab') {
                              setFastingRequired(false);
                            }
                          }}
                        >
                          <Text style={styles.dropdownItemText}>
                            {getAppointmentTypeLabel(type as AppointmentType)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {appointmentType === 'lab' && (
                  <View style={styles.inputGroup}>
                    <View style={styles.switchContainer}>
                      <Text style={styles.inputLabel}>Fasting Required</Text>
                      <Switch
                        value={fastingRequired}
                        onValueChange={setFastingRequired}
                        trackColor={{ false: currentTheme.muted, true: currentTheme.primary }}
                        thumbColor={fastingRequired ? currentTheme.primaryForeground : currentTheme.mutedForeground}
                      />
                    </View>
                  </View>
                )}

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
                    onPress={handleAddAppointment}
                    disabled={submitting}
                  >
                    <Plus size={20} color={currentTheme.primaryForeground} />
                    <Text style={styles.submitButtonText}>
                      {submitting ? 'Adding...' : 'Add Appointment'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowEditModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderContent}>
                  <CalendarIcon size={24} color={currentTheme.primary} />
                  <Text style={styles.modalTitle}>Appointment Details</Text>
                </View>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <X size={24} color={currentTheme.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.formContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {selectedAppointment && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Date</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowEditDateCalendar(!showEditDateCalendar)}
                      >
                        <CalendarIcon size={20} color={currentTheme.mutedForeground} />
                        <Text style={styles.dateButtonText}>
                          {new Date(editDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </TouchableOpacity>
                      {showEditDateCalendar && (
                        <Calendar
                          current={editDate}
                          onDayPress={(day) => {
                            setEditDate(day.dateString);
                            setShowEditDateCalendar(false);
                          }}
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

                    {selectedAppointment.doctor && (
                      <View style={styles.appointmentInfo}>
                        <Text style={styles.appointmentInfoLabel}>Doctor:</Text>
                        <Text style={styles.appointmentInfoValue}>
                          Dr. {selectedAppointment.doctor}
                        </Text>
                      </View>
                    )}

                    {selectedAppointment.type && (
                      <View style={styles.appointmentInfo}>
                        <Text style={styles.appointmentInfoLabel}>Type:</Text>
                        <Text style={styles.appointmentInfoValue}>
                          {getAppointmentTypeLabel(selectedAppointment.type)}
                        </Text>
                      </View>
                    )}

                    {selectedAppointment.type === 'lab' && (
                      <View style={styles.inputGroup}>
                        <View style={styles.switchContainer}>
                          <Text style={styles.inputLabel}>Fasting Required</Text>
                          <Switch
                            value={editFastingRequired}
                            onValueChange={setEditFastingRequired}
                            trackColor={{ false: currentTheme.muted, true: currentTheme.primary }}
                            thumbColor={editFastingRequired ? currentTheme.primaryForeground : currentTheme.mutedForeground}
                          />
                        </View>
                      </View>
                    )}

                    {shouldShowField('medications') && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Medications</Text>
                        <View style={styles.addItemContainer}>
                          <TextInput
                            style={styles.addItemInput}
                            placeholder="Add medication..."
                            value={currentMedication}
                            onChangeText={setCurrentMedication}
                            placeholderTextColor={currentTheme.mutedForeground}
                            onSubmitEditing={addMedication}
                          />
                          <TouchableOpacity style={styles.addItemButton} onPress={addMedication}>
                            <Plus size={20} color={currentTheme.primaryForeground} />
                          </TouchableOpacity>
                        </View>
                        {medications.length > 0 && (
                          <View style={styles.chipContainer}>
                            {medications.map((med, index) => (
                              <View key={index} style={styles.chip}>
                                <Text style={styles.chipText}>{med}</Text>
                                <TouchableOpacity onPress={() => removeMedication(index)}>
                                  <X size={16} color={currentTheme.foreground} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}

                    {shouldShowField('exercises') && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Exercises</Text>
                        <View style={styles.addItemContainer}>
                          <TextInput
                            style={styles.addItemInput}
                            placeholder="Add exercise..."
                            value={currentExercise}
                            onChangeText={setCurrentExercise}
                            placeholderTextColor={currentTheme.mutedForeground}
                            onSubmitEditing={addExercise}
                          />
                          <TouchableOpacity style={styles.addItemButton} onPress={addExercise}>
                            <Plus size={20} color={currentTheme.primaryForeground} />
                          </TouchableOpacity>
                        </View>
                        {exercises.length > 0 && (
                          <View style={styles.chipContainer}>
                            {exercises.map((exercise, index) => (
                              <View key={index} style={styles.chip}>
                                <Text style={styles.chipText}>{exercise}</Text>
                                <TouchableOpacity onPress={() => removeExercise(index)}>
                                  <X size={16} color={currentTheme.foreground} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}

                    {shouldShowField('painScore') && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Pain Score (0-10)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="0-10"
                          value={painScore}
                          onChangeText={(text) => {
                            const num = parseInt(text);
                            if (text === '' || (!isNaN(num) && num >= 0 && num <= 10)) {
                              setPainScore(text);
                            }
                          }}
                          keyboardType="number-pad"
                          maxLength={2}
                          placeholderTextColor={currentTheme.mutedForeground}
                        />
                      </View>
                    )}

                    {shouldShowField('dietPlan') && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Diet Plan</Text>
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          placeholder="Add diet recommendations..."
                          value={dietPlan}
                          onChangeText={setDietPlan}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                          placeholderTextColor={currentTheme.mutedForeground}
                        />
                      </View>
                    )}

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Follow-up Date (Optional)</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowFollowUpCalendar(!showFollowUpCalendar)}
                      >
                        <CalendarIcon size={20} color={currentTheme.mutedForeground} />
                        <Text style={styles.dateButtonText}>
                          {followUpDate
                            ? new Date(followUpDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Select date'}
                        </Text>
                      </TouchableOpacity>
                      {showFollowUpCalendar && (
                        <Calendar
                          current={followUpDate || new Date().toISOString().split('T')[0]}
                          onDayPress={(day) => {
                            setFollowUpDate(day.dateString);
                            setShowFollowUpCalendar(false);
                          }}
                          minDate={new Date().toISOString().split('T')[0]}
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
                      <Text style={styles.inputLabel}>Notes</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Add notes from your appointment..."
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        placeholderTextColor={currentTheme.mutedForeground}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <View style={styles.switchContainer}>
                        <Text style={styles.inputLabel}>Cancelled</Text>
                        <Switch
                          value={isCancelled}
                          onValueChange={setIsCancelled}
                          trackColor={{ false: currentTheme.muted, true: currentTheme.destructive }}
                          thumbColor={isCancelled ? currentTheme.primaryForeground : currentTheme.mutedForeground}
                        />
                      </View>
                    </View>

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setShowEditModal(false)}
                        disabled={updating}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitButton, updating && styles.submitButtonDisabled]}
                        onPress={handleUpdateAppointment}
                        disabled={updating}
                      >
                        <Text style={styles.submitButtonText}>
                          {updating ? 'Saving...' : 'Save Details'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.foreground,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.mutedForeground,
  },
  addButton: {
    backgroundColor: theme.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.foreground,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.mutedForeground,
    marginTop: 8,
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.foreground,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentHeader: {
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.cardForeground,
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  appointmentDetailText: {
    fontSize: 14,
    color: theme.mutedForeground,
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.mutedForeground,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: theme.cardForeground,
    lineHeight: 20,
  },
  tapToAddText: {
    fontSize: 12,
    color: theme.mutedForeground,
    fontStyle: 'italic',
    marginTop: 8,
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
  textArea: {
    minHeight: 100,
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
  appointmentInfo: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  appointmentInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.mutedForeground,
    marginBottom: 4,
  },
  appointmentInfoValue: {
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
  badgesContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  typeBadge: {
    backgroundColor: theme.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.primary,
  },
  statusTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  followUpTag: {
    backgroundColor: '#3b82f6' + '20',
  },
  cancelledTag: {
    backgroundColor: '#ef4444' + '20',
  },
  rescheduledTag: {
    backgroundColor: '#f59e0b' + '20',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.foreground,
  },
  fastingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  followUpText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: theme.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dropdownItemText: {
    fontSize: 16,
    color: theme.cardForeground,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addItemContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: theme.card,
    color: theme.cardForeground,
  },
  addItemButton: {
    backgroundColor: theme.primary,
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.muted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 14,
    color: theme.foreground,
  },
});
