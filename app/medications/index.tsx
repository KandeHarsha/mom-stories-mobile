import themes from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, Edit2, Pill, Plus, Trash2, X } from 'lucide-react-native';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    createMedication,
    CreateMedicationPayload,
    deleteMedication,
    getMedications,
    Medication,
    MedicationType,
    updateMedication,
    UpdateMedicationPayload
} from '../services/medication-service';

const MEDICATION_TYPES: MedicationType[] = ['tablet', 'tonic', 'powder', 'drops'];

export default function MedicationsScreen() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const { session } = useAuth();
  const router = useRouter();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('');
  const [dosage, setDosage] = useState('');
  const [type, setType] = useState<MedicationType>('tablet');
  const [showTypePicker, setShowTypePicker] = useState(false);

  const styles = createStyles(currentTheme);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }

    try {
      const data = await getMedications(session.accessToken);
      setMedications(data);
    } catch (err) {
      console.error('Failed to fetch medications:', err);
      Alert.alert('Error', 'Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setFrequency('');
    setDosage('');
    setType('tablet');
    setShowTypePicker(false);
  };

  const handleAddMedication = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter medication name');
      return;
    }
    if (!dosage.trim()) {
      Alert.alert('Error', 'Please enter dosage');
      return;
    }
    if (!frequency.trim()) {
      Alert.alert('Error', 'Please enter frequency');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateMedicationPayload = {
        title: title.trim(),
        frequency: frequency.trim(),
        dosage: dosage.trim(),
        type,
      };

      await createMedication(session!.accessToken, payload);

      // Refresh list
      await fetchMedications();

      // Reset form
      resetForm();
      setShowAddModal(false);

      Alert.alert('Success', 'Medication added successfully!');
    } catch (err) {
      console.error('Failed to add medication:', err);
      Alert.alert('Error', 'Failed to add medication. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMedication = async () => {
    if (!selectedMedication) return;

    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter medication name');
      return;
    }
    if (!dosage.trim()) {
      Alert.alert('Error', 'Please enter dosage');
      return;
    }
    if (!frequency.trim()) {
      Alert.alert('Error', 'Please enter frequency');
      return;
    }

    setSubmitting(true);
    try {
      const payload: UpdateMedicationPayload = {
        title: title.trim(),
        frequency: frequency.trim(),
        dosage: dosage.trim(),
        type,
      };

      await updateMedication(session!.accessToken, selectedMedication.id, payload);

      // Refresh list
      await fetchMedications();

      // Reset form
      resetForm();
      setShowEditModal(false);
      setSelectedMedication(null);

      Alert.alert('Success', 'Medication updated successfully!');
    } catch (err) {
      console.error('Failed to update medication:', err);
      Alert.alert('Error', 'Failed to update medication. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMedication = async () => {
    if (!selectedMedication) return;

    Alert.alert(
      'Delete Medication',
      `Are you sure you want to delete "${selectedMedication.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMedication(session!.accessToken, selectedMedication.id);
              await fetchMedications();
              setShowDetailModal(false);
              setSelectedMedication(null);
              Alert.alert('Success', 'Medication deleted successfully!');
            } catch (err) {
              console.error('Failed to delete medication:', err);
              Alert.alert('Error', 'Failed to delete medication. Please try again.');
            }
          },
        },
      ]
    );
  };

  const openDetailModal = (medication: Medication) => {
    setSelectedMedication(medication);
    setShowDetailModal(true);
  };

  const openEditFromDetail = () => {
    if (!selectedMedication) return;
    setTitle(selectedMedication.title);
    setFrequency(selectedMedication.frequency);
    setDosage(selectedMedication.dosage);
    setType(selectedMedication.type);
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Pill size={28} color={currentTheme.primary} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Medication Reminders</Text>
            <Text style={styles.headerSubtitle}>Track your medications and dosages</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {medications.length === 0 ? (
          <View style={styles.emptyState}>
            <Pill size={64} color={currentTheme.mutedForeground} />
            <Text style={styles.emptyStateTitle}>No Medications Yet</Text>
            <Text style={styles.emptyStateDescription}>
              Start tracking your medications by adding them below
            </Text>
          </View>
        ) : (
          <View style={styles.medicationsList}>
            {medications.map((medication) => (
              <TouchableOpacity
                key={medication.id}
                style={styles.medicationCard}
                onPress={() => openDetailModal(medication)}
                activeOpacity={0.7}
              >
                <View style={styles.medicationHeader}>
                  <View style={styles.medicationIconContainer}>
                    <Pill size={20} color={currentTheme.primary} />
                  </View>
                  <View style={styles.medicationDetails}>
                    <Text style={styles.medicationTitle}>{medication.title}</Text>
                    <Text style={styles.medicationType}>
                      {medication.type.charAt(0).toUpperCase() + medication.type.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.medicationInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Dosage:</Text>
                    <Text style={styles.infoValue}>{medication.dosage}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Frequency:</Text>
                    <Text style={styles.infoValue}>{medication.frequency}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color={currentTheme.primaryForeground} />
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDetailModal(false);
          setSelectedMedication(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDetailModal(false);
            setSelectedMedication(null);
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.detailModalContent}
          >
            {selectedMedication && (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.detailIconContainer}>
                    <Pill size={32} color={currentTheme.primary} />
                  </View>
                  <Text style={styles.detailTitle}>{selectedMedication.title}</Text>
                  <Text style={styles.detailType}>
                    {selectedMedication.type.charAt(0).toUpperCase() + selectedMedication.type.slice(1)}
                  </Text>
                </View>

                <View style={styles.detailInfo}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dosage</Text>
                    <Text style={styles.detailValue}>{selectedMedication.dosage}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Frequency</Text>
                    <Text style={styles.detailValue}>{selectedMedication.frequency}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Added</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedMedication.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={openEditFromDetail}
                  >
                    <Edit2 size={20} color={currentTheme.primary} />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteMedication}
                  >
                    <Trash2 size={20} color={currentTheme.destructive} />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.closeDetailButton}
                  onPress={() => {
                    setShowDetailModal(false);
                    setSelectedMedication(null);
                  }}
                >
                  <Text style={styles.closeDetailButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add Medication Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowAddModal(false);
              resetForm();
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Medication</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  <X size={24} color={currentTheme.foreground} />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Medication Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Vitamin D"
                    placeholderTextColor={currentTheme.mutedForeground}
                    value={title}
                    onChangeText={setTitle}
                    editable={!submitting}
                  />
                </View>

                {/* Type Picker */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Type *</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowTypePicker(!showTypePicker)}
                    disabled={submitting}
                  >
                    <Text style={styles.pickerButtonText}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                    <ChevronDown size={20} color={currentTheme.mutedForeground} />
                  </TouchableOpacity>
                  {showTypePicker && (
                    <View style={styles.pickerOptions}>
                      {MEDICATION_TYPES.map((medType) => (
                        <TouchableOpacity
                          key={medType}
                          style={styles.pickerOption}
                          onPress={() => {
                            setType(medType);
                            setShowTypePicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>
                            {medType.charAt(0).toUpperCase() + medType.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Dosage */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Dosage *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 1000 IU"
                    placeholderTextColor={currentTheme.mutedForeground}
                    value={dosage}
                    onChangeText={setDosage}
                    editable={!submitting}
                  />
                </View>

                {/* Frequency */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Frequency *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Once daily"
                    placeholderTextColor={currentTheme.mutedForeground}
                    value={frequency}
                    onChangeText={setFrequency}
                    editable={!submitting}
                  />
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleAddMedication}
                  disabled={submitting}
                >
                  <Text style={styles.submitButtonText}>
                    {submitting ? 'Adding...' : 'Add Medication'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Medication Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditModal(false);
          setSelectedMedication(null);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowEditModal(false);
              setSelectedMedication(null);
              resetForm();
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Medication</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowEditModal(false);
                    setSelectedMedication(null);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  <X size={24} color={currentTheme.foreground} />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Medication Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Vitamin D"
                    placeholderTextColor={currentTheme.mutedForeground}
                    value={title}
                    onChangeText={setTitle}
                    editable={!submitting}
                  />
                </View>

                {/* Type Picker */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Type *</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowTypePicker(!showTypePicker)}
                    disabled={submitting}
                  >
                    <Text style={styles.pickerButtonText}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                    <ChevronDown size={20} color={currentTheme.mutedForeground} />
                  </TouchableOpacity>
                  {showTypePicker && (
                    <View style={styles.pickerOptions}>
                      {MEDICATION_TYPES.map((medType) => (
                        <TouchableOpacity
                          key={medType}
                          style={styles.pickerOption}
                          onPress={() => {
                            setType(medType);
                            setShowTypePicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>
                            {medType.charAt(0).toUpperCase() + medType.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Dosage */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Dosage *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 1000 IU"
                    placeholderTextColor={currentTheme.mutedForeground}
                    value={dosage}
                    onChangeText={setDosage}
                    editable={!submitting}
                  />
                </View>

                {/* Frequency */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Frequency *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Once daily"
                    placeholderTextColor={currentTheme.mutedForeground}
                    value={frequency}
                    onChangeText={setFrequency}
                    editable={!submitting}
                  />
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowEditModal(false);
                    setSelectedMedication(null);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleEditMedication}
                  disabled={submitting}
                >
                  <Text style={styles.submitButtonText}>
                    {submitting ? 'Updating...' : 'Update Medication'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof themes.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      backgroundColor: theme.background,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      marginBottom: 12,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.foreground,
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.mutedForeground,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
    },
    emptyStateTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.foreground,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateDescription: {
      fontSize: 14,
      color: theme.mutedForeground,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    medicationsList: {
      gap: 12,
    },
    medicationCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    medicationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    medicationIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    medicationDetails: {
      flex: 1,
    },
    medicationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.cardForeground,
      marginBottom: 2,
    },
    medicationType: {
      fontSize: 12,
      color: theme.mutedForeground,
      textTransform: 'capitalize',
    },
    medicationInfo: {
      gap: 8,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    infoLabel: {
      fontSize: 14,
      color: theme.mutedForeground,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.cardForeground,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
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
    detailModalContent: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 20,
      paddingHorizontal: 20,
    },
    detailHeader: {
      alignItems: 'center',
      paddingTop: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    detailIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    detailTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.foreground,
      marginBottom: 4,
    },
    detailType: {
      fontSize: 14,
      color: theme.mutedForeground,
    },
    detailInfo: {
      paddingVertical: 20,
      gap: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 16,
      color: theme.mutedForeground,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
    },
    detailActions: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    editButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    editButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
    },
    deleteButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.destructive,
      backgroundColor: theme.destructive + '10',
    },
    deleteButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.destructive,
    },
    closeDetailButton: {
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: theme.muted,
      alignItems: 'center',
    },
    closeDetailButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.mutedForeground,
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
    pickerButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: theme.card,
    },
    pickerButtonText: {
      fontSize: 16,
      color: theme.cardForeground,
    },
    pickerOptions: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.card,
      overflow: 'hidden',
    },
    pickerOption: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    pickerOptionText: {
      fontSize: 16,
      color: theme.cardForeground,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
    },
    submitButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primaryForeground,
    },
  });
