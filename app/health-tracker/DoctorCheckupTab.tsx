import themes from '@/constants/colors';
import { CalendarIcon, Plus, Stethoscope, User } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
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

interface Checkup {
  id: string;
  date: string;
  doctorName?: string;
  notes?: string;
  medications?: string;
  type: 'completed' | 'upcoming';
}

// Dummy data
const initialCheckups: Checkup[] = [
  {
    id: '1',
    date: '2024-01-15',
    doctorName: 'Dr. Sarah Johnson',
    notes: 'Regular checkup. Baby is developing well. Weight and height are on track.',
    medications: 'Vitamin D drops - 1 drop daily',
    type: 'completed',
  },
  {
    id: '2',
    date: '2024-02-20',
    doctorName: 'Dr. Michael Chen',
    notes: 'Vaccination appointment. All vaccines administered successfully.',
    medications: 'Paracetamol if fever develops',
    type: 'completed',
  },
  {
    id: '3',
    date: '2024-03-25',
    doctorName: 'Dr. Sarah Johnson',
    type: 'upcoming',
  },
];

export default function DoctorCheckupTab() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const [checkups, setCheckups] = useState<Checkup[]>(initialCheckups);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCheckup, setSelectedCheckup] = useState<Checkup | null>(null);
  const [newCheckup, setNewCheckup] = useState({
    date: new Date().toISOString().split('T')[0],
    doctorName: '',
  });
  const [showCalendar, setShowCalendar] = useState(false);

  const styles = createStyles(currentTheme);

  const handleAddCheckup = () => {
    if (!newCheckup.date.trim()) {
      Alert.alert('Error', 'Please select a date for the checkup');
      return;
    }

    const checkup: Checkup = {
      id: Date.now().toString(),
      date: newCheckup.date,
      doctorName: newCheckup.doctorName || undefined,
      type: 'upcoming',
    };

    setCheckups([...checkups, checkup]);
    setNewCheckup({ date: new Date().toISOString().split('T')[0], doctorName: '' });
    setShowAddModal(false);
  };

  const handleCheckupPress = (checkup: Checkup) => {
    setSelectedCheckup(checkup);
    setShowDetailsModal(true);
  };

  const handleUpdateCheckup = (notes: string, medications: string) => {
    if (!selectedCheckup) return;

    const updatedCheckups = checkups.map(checkup =>
      checkup.id === selectedCheckup.id
        ? { ...checkup, notes, medications, type: 'completed' as const }
        : checkup
    );

    setCheckups(updatedCheckups);
    setShowDetailsModal(false);
    setSelectedCheckup(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderCheckupItem = ({ item }: { item: Checkup }) => (
    <TouchableOpacity
      style={[
        styles.checkupCard,
        item.type === 'upcoming' ? styles.upcomingCard : styles.completedCard,
      ]}
      onPress={() => handleCheckupPress(item)}
    >
      <View style={styles.checkupHeader}>
        <View style={styles.checkupInfo}>
          <Text style={styles.checkupDate}>{formatDate(item.date)}</Text>
          {item.doctorName && (
            <View style={styles.doctorInfo}>
              <User size={16} color={currentTheme.mutedForeground} />
              <Text style={styles.doctorName}>{item.doctorName}</Text>
            </View>
          )}
        </View>
        <View style={[
          styles.statusBadge,
          item.type === 'upcoming' ? styles.upcomingBadge : styles.completedBadge,
        ]}>
          <Text style={[
            styles.statusText,
            item.type === 'upcoming' ? styles.upcomingText : styles.completedText,
          ]}>
            {item.type === 'upcoming' ? 'Upcoming' : 'Completed'}
          </Text>
        </View>
      </View>
      
      {item.notes && (
        <Text style={styles.checkupNotes} numberOfLines={2}>
          {item.notes}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Stethoscope size={24} color={currentTheme.primary} />
          <Text style={styles.headerTitle}>Doctor Checkups</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={20} color={currentTheme.primaryForeground} />
          <Text style={styles.addButtonText}>Add Checkup</Text>
        </TouchableOpacity>
      </View>

      {/* Checkups List */}
      <FlatList
        data={checkups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        renderItem={renderCheckupItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Checkup Modal */}
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
                <Text style={styles.modalTitle}>Add New Checkup</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalContentScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowCalendar(!showCalendar)}
                  >
                    <CalendarIcon size={20} color={currentTheme.mutedForeground} />
                    <Text style={styles.dateButtonText}>
                      {new Date(newCheckup.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </TouchableOpacity>
                  {showCalendar && (
                    <Calendar
                      current={newCheckup.date}
                      onDayPress={(day: any) => {
                        setNewCheckup({ ...newCheckup, date: day.dateString });
                        setShowCalendar(false);
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
                  <Text style={styles.inputLabel}>Doctor Name (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={newCheckup.doctorName}
                    onChangeText={(text) => setNewCheckup({ ...newCheckup, doctorName: text })}
                    placeholder="Enter doctor's name"
                    placeholderTextColor={currentTheme.mutedForeground}
                  />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleAddCheckup}>
                  <Text style={styles.saveButtonText}>Add Checkup</Text>
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Checkup Details Modal */}
      <CheckupDetailsModal
        visible={showDetailsModal}
        checkup={selectedCheckup}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedCheckup(null);
        }}
        onUpdate={handleUpdateCheckup}
        theme={currentTheme}
      />
    </View>
  );
}

interface CheckupDetailsModalProps {
  visible: boolean;
  checkup: Checkup | null;
  onClose: () => void;
  onUpdate: (notes: string, medications: string) => void;
  theme: any;
}

function CheckupDetailsModal({ visible, checkup, onClose, onUpdate, theme }: CheckupDetailsModalProps) {
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState('');

  React.useEffect(() => {
    if (checkup) {
      setNotes(checkup.notes || '');
      setMedications(checkup.medications || '');
    }
  }, [checkup]);

  const handleSave = () => {
    onUpdate(notes, medications);
  };

  const styles = createStyles(theme);

  if (!checkup) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Checkup Details</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.cancelButton}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContentScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsDate}>{new Date(checkup.date).toLocaleDateString()}</Text>
                {checkup.doctorName && (
                  <Text style={styles.detailsDoctor}>Dr. {checkup.doctorName}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes about the checkup..."
                  placeholderTextColor={theme.mutedForeground}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Medications</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={medications}
                  onChangeText={setMedications}
                  placeholder="Add medications prescribed..."
                  placeholderTextColor={theme.mutedForeground}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.foreground,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addButtonText: {
    color: theme.primaryForeground,
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
    gap: 16,
  },
  checkupCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  upcomingCard: {
    backgroundColor: theme.background,
    borderColor: theme.primary,
  },
  completedCard: {
    backgroundColor: theme.muted,
    borderColor: theme.border,
  },
  checkupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkupInfo: {
    flex: 1,
  },
  checkupDate: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.foreground,
    marginBottom: 4,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doctorName: {
    fontSize: 14,
    color: theme.mutedForeground,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upcomingBadge: {
    backgroundColor: theme.primary + '20',
  },
  completedBadge: {
    backgroundColor: theme.secondary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  upcomingText: {
    color: theme.primary,
  },
  completedText: {
    color: theme.secondaryForeground,
  },
  checkupNotes: {
    fontSize: 14,
    color: theme.mutedForeground,
    lineHeight: 20,
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
    fontSize: 18,
    fontWeight: '600',
    color: theme.foreground,
  },
  cancelButton: {
    color: theme.primary,
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.foreground,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.foreground,
    backgroundColor: theme.background,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: theme.primaryForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  detailsHeader: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: theme.muted,
    borderRadius: 8,
  },
  detailsDate: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.foreground,
    marginBottom: 4,
  },
  detailsDoctor: {
    fontSize: 16,
    color: theme.mutedForeground,
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
  modalContentScroll: {
    padding: 20,
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
    backgroundColor: theme.background,
  },
  dateButtonText: {
    fontSize: 16,
    color: theme.foreground,
  },
  calendar: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
});