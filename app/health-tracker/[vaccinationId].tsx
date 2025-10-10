import themes from '@/constants/colors';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ImagePlus, Loader2, Paperclip, Syringe, ViewIcon, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export interface MergedVaccination {
  id: string;
  name: string;
  age: string;
  dose: string;
  description: string;
  status: 0 | 1; // 0 = pending, 1 = complete
  order: number;
  imageUrl?: string;
}

const VaccinationDetail = () => {
  const params = useLocalSearchParams<{
    vaccinationId: string;
    name: string;
    age: string;
    dose: string;
    description: string;
    status: string;
    order: string;
    imageUrl?: string;
  }>();

  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const { token, loading: authLoading } = useAuth();

  const [vaccination, setVaccination] = useState<MergedVaccination | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [vaxImageFile, setVaxImageFile] = useState<any>(null);
  const [vaxImagePreview, setVaxImagePreview] = useState<string | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  // Memoize vaccination data to prevent infinite re-renders
  const vaccinationData = useMemo(() => {
    if (params.vaccinationId && params.name) {
      return {
        id: params.vaccinationId,
        name: params.name,
        age: params.age || '',
        dose: params.dose || '',
        description: params.description || '',
        status: parseInt(params.status || '0') as 0 | 1,
        order: parseInt(params.order || '0'),
        imageUrl: params.imageUrl && params.imageUrl.trim() !== '' ? params.imageUrl : undefined,
      };
    }
    return null;
  }, [params.vaccinationId, params.name, params.age, params.dose, params.description, params.status, params.order, params.imageUrl]);

  useEffect(() => {
    if (vaccinationData) {
      setVaccination(vaccinationData);
    } else if (params.vaccinationId) {
      // Fetch vaccination data from API if not passed via params
      fetchVaccinationById(params.vaccinationId);
    }
  }, [vaccinationData, params.vaccinationId]);

  const fetchVaccinationById = async (vaccinationId: string) => {
    if (!token || authLoading) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/vaccinations/${vaccinationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vaccination: ${response.status}`);
      }

      const data = await response.json();
      setVaccination(data);
    } catch (error) {
      console.error('Error fetching vaccination:', error);
      Alert.alert('Error', 'Vaccination data not found', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  const handleVaxStatusChange = (checked: boolean) => {
    if (checked) {
      setIsConfirming(true);
    } else {
      updateStatus(0);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setVaxImageFile(result.assets[0]);
      setVaxImagePreview(result.assets[0].uri);
    }
  };

  const handleRemoveFile = () => {
    setVaxImageFile(null);
    setVaxImagePreview(null);
  };

  const resetDialog = () => {
    setIsConfirming(false);
    handleRemoveFile();
  };

  const handleConfirmUpdate = () => {
    updateStatus(1, vaxImageFile);
  };

  const updateStatus = async (status: 0 | 1, imageFile: any = null) => {
    if (!vaccination || !token || authLoading) return;

    setIsUpdating(true);

    try {
      const formData = new FormData();
      formData.append('status', status.toString());

      if (imageFile) {
        formData.append('image', {
          uri: imageFile.uri,
          type: imageFile.mimeType || 'image/jpeg',
          name: imageFile.fileName || 'vaccination.jpg',
        } as any);
      }

      const response = await fetch(`${API_BASE_URL}/vaccinations/${vaccination.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to update vaccination: ${response.status}`);
      }

      const result = await response.json();

      setVaccination({
        ...vaccination,
        status,
        imageUrl: result.imageUrl || vaccination.imageUrl
      });

      Alert.alert('Status Updated', "Vaccination status has been saved");
      resetDialog();
    } catch (error) {
      console.error('Error updating vaccination status:', error);
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };

  const styles = createStyles(currentTheme);

  if (!vaccination) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading vaccination...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: vaccination?.name || 'Vaccination Details',
          headerBackTitle: Platform.OS === 'ios' ? 'Back' : '',
          headerStyle: {
            backgroundColor: currentTheme.background,
          },
          headerTintColor: currentTheme.foreground,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
        }}
      />
      <SafeAreaView style={styles.container}>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Vaccination Info */}
          <View style={styles.vaccinationInfo}>
            <View style={styles.iconContainer}>
              <Syringe size={32} color={currentTheme.primary} />
            </View>
            <Text style={styles.vaccinationName}>{vaccination.name}</Text>
            <Text style={styles.vaccinationDetails}>
              Recommended Age: {vaccination.age}
            </Text>
            <Text style={styles.vaccinationDetails}>
              Dose: {vaccination.dose}
            </Text>
          </View>

          {/* Current Status */}
          <View style={styles.statusSection}>
            <Text style={styles.statusLabel}>Current Status:</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: vaccination.status === 1 ? '#10b981' : currentTheme.muted }
            ]}>
              <Text style={[
                styles.statusText,
                { color: vaccination.status === 1 ? 'white' : currentTheme.mutedForeground }
              ]}>
                {vaccination.status === 1 ? 'Complete' : 'Pending'}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{vaccination.description}</Text>
          </View>

          {/* Document */}
          {vaccination.imageUrl && (
            <View style={styles.documentSection}>
              <Text style={styles.sectionTitle}>Vaccination Document</Text>
              <TouchableOpacity
                style={styles.documentButton}
                onPress={() => setViewingImageUrl(vaccination.imageUrl!)}
              >
                <ViewIcon size={20} color={currentTheme.primary} />
                <Text style={styles.documentButtonText}>View Document</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Status Update */}
          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>Update Status</Text>
            <TouchableOpacity
              style={styles.statusButton}
              onPress={() => handleVaxStatusChange(vaccination.status !== 1)}
              disabled={isUpdating}
            >
              <View style={styles.checkboxContainer}>
                <View style={[
                  styles.checkbox,
                  vaccination.status === 1 && styles.checkboxChecked
                ]}>
                  {vaccination.status === 1 && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </View>
              <Text style={styles.statusButtonText}>
                {vaccination.status === 1 ? 'Mark as incomplete' : 'Mark as complete'}
              </Text>
              {isUpdating && (
                <Loader2 size={16} color={currentTheme.primary} />
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Confirmation Modal */}
      <Modal
        visible={isConfirming}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetDialog}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetDialog}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Confirm Vaccination</Text>
            <TouchableOpacity
              onPress={handleConfirmUpdate}
              disabled={isUpdating}
              style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
            >
              <Text style={[styles.saveButtonText, isUpdating && styles.saveButtonTextDisabled]}>
                {isUpdating ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSubtitle}>
              You are marking "{vaccination.name}" as complete. You can optionally upload a photo of the vaccination record.
            </Text>

            {/* Upload Section */}
            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Upload Record (Optional)</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <ImagePlus size={20} color={currentTheme.primary} />
                <Text style={styles.uploadButtonText}>
                  {vaxImageFile ? 'Change photo' : 'Upload photo'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Image Preview */}
            {vaxImagePreview && vaxImageFile && (
              <View style={styles.previewSection}>
                <Text style={styles.uploadLabel}>Photo Preview</Text>
                <View style={styles.imagePreview}>
                  <RNImage
                    source={{ uri: vaxImagePreview }}
                    style={styles.previewImage}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={handleRemoveFile}
                  >
                    <X size={16} color="white" />
                  </TouchableOpacity>
                </View>
                <View style={styles.fileInfo}>
                  <Paperclip size={16} color={currentTheme.mutedForeground} />
                  <Text style={styles.fileName}>
                    {vaxImageFile.fileName || 'vaccination.jpg'}
                  </Text>
                  <Text style={styles.fileSize}>
                    {Math.round((vaxImageFile.fileSize || 0) / 1024)} KB
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Image Viewing Modal */}
      <Modal
        visible={!!viewingImageUrl}
        animationType="fade"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewingImageUrl(null)}
      >
        <SafeAreaView style={styles.imageModalContainer}>
          <View style={styles.imageModalHeader}>
            <TouchableOpacity onPress={() => setViewingImageUrl(null)}>
              <ArrowLeft size={24} color={currentTheme.foreground} />
            </TouchableOpacity>
            <Text style={styles.imageModalTitle}>Vaccination Document</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.imageModalContent}>
            <RNImage
              source={{ uri: viewingImageUrl || '' }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

export default VaccinationDetail;

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.mutedForeground,
  },
  vaccinationInfo: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    shadowColor: theme.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    backgroundColor: theme.muted,
    borderRadius: 30,
    padding: 16,
    marginBottom: 16,
  },
  vaccinationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.cardForeground,
    textAlign: 'center',
    marginBottom: 8,
  },
  vaccinationDetails: {
    fontSize: 16,
    color: theme.mutedForeground,
    textAlign: 'center',
    marginBottom: 4,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: theme.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.cardForeground,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionSection: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: theme.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.cardForeground,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: theme.mutedForeground,
    lineHeight: 24,
  },
  documentSection: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: theme.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.muted,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  documentButtonText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '500',
  },
  actionSection: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
    shadowColor: theme.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkboxContainer: {
    marginRight: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.background,
  },
  checkboxChecked: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusButtonText: {
    fontSize: 16,
    color: theme.cardForeground,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cancelButton: {
    fontSize: 16,
    color: theme.mutedForeground,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.foreground,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.primary,
    borderRadius: 6,
  },
  saveButtonDisabled: {
    backgroundColor: theme.muted,
  },
  saveButtonText: {
    color: theme.primaryForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: theme.mutedForeground,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: theme.mutedForeground,
    marginBottom: 24,
    lineHeight: 22,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.foreground,
    marginBottom: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.primary,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  previewSection: {
    marginBottom: 20,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.muted,
    borderRadius: 6,
    gap: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: theme.mutedForeground,
  },
  fileSize: {
    fontSize: 14,
    color: theme.mutedForeground,
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  imageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  imageModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.foreground,
  },
  imageModalContent: {
    flex: 1,
    padding: 20,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});