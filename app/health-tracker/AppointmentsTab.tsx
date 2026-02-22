import themes from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { Calendar as CalendarIcon, CalendarPlus, Plus, Stethoscope, X } from 'lucide-react-native';
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

interface Appointment {
  id: string;
  date: string;
  doctor?: string;
  doctorNotes?: string;
  medications?: string;
}

export default function AppointmentsTab() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const { session } = useAuth();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add appointment modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [doctorName, setDoctorName] = useState('');
  const [showDateCalendar, setShowDateCalendar] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit appointment modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [medications, setMedications] = useState('');
  const [updating, setUpdating] = useState(false);

  const styles = createStyles(currentTheme);

  useEffect(() => {
    fetchAppointments();
  }, [session]);

  const fetchAppointments = async () => {
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
      setAppointments(data.appointments || data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

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

      const body: any = { date: dateISO };
      if (doctorName.trim()) {
        body.doctor = doctorName.trim();
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
      const body: any = {};
      if (doctorNotes.trim()) {
        body.doctorNotes = doctorNotes.trim();
      }
      if (medications.trim()) {
        body.medications = medications.trim();
      }

      const response = await fetch(`${API_BASE_URL}/appointment/${selectedAppointment.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment');
      }

      // Refresh appointments list
      await fetchAppointments();

      // Reset form
      setDoctorNotes('');
      setMedications('');
      setSelectedAppointment(null);
      setShowEditModal(false);

      Alert.alert('Success', 'Appointment updated successfully!');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update appointment');
    } finally {
      setUpdating(false);
    }
  };

  const openEditModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDoctorNotes(appointment.doctorNotes || '');
    setMedications(appointment.medications || '');
    setShowEditModal(true);
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CalendarPlus size={24} color={currentTheme.primary} />
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>Appointments</Text>
              <Text style={styles.cardDescription}>
                Track your medical appointments and notes
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Plus size={20} color={currentTheme.primaryForeground} />
            </TouchableOpacity>
          </View>
        </View>

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
              </View>

              {appointment.doctor && (
                <View style={styles.appointmentDetail}>
                  <Stethoscope size={16} color={currentTheme.mutedForeground} />
                  <Text style={styles.appointmentDetailText}>
                    Dr. {appointment.doctor}
                  </Text>
                </View>
              )}

              {appointment.doctorNotes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText} numberOfLines={2}>
                    {appointment.doctorNotes}
                  </Text>
                </View>
              )}

              {appointment.medications && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Medications:</Text>
                  <Text style={styles.notesText} numberOfLines={2}>
                    {appointment.medications}
                  </Text>
                </View>
              )}

              {!appointment.doctorNotes && !appointment.medications && (
                <Text style={styles.tapToAddText}>Tap to add notes</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

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
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.appointmentInfoLabel}>Date:</Text>
                      <Text style={styles.appointmentInfoValue}>
                        {formatDate(selectedAppointment.date)}
                      </Text>
                    </View>

                    {selectedAppointment.doctor && (
                      <View style={styles.appointmentInfo}>
                        <Text style={styles.appointmentInfoLabel}>Doctor:</Text>
                        <Text style={styles.appointmentInfoValue}>
                          Dr. {selectedAppointment.doctor}
                        </Text>
                      </View>
                    )}

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Doctor Notes</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Add notes from your appointment..."
                        value={doctorNotes}
                        onChangeText={setDoctorNotes}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        placeholderTextColor={currentTheme.mutedForeground}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Medications</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="List any prescribed medications..."
                        value={medications}
                        onChangeText={setMedications}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        placeholderTextColor={currentTheme.mutedForeground}
                      />
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
  addButton: {
    backgroundColor: theme.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
});
