import themes from '@/constants/colors'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useColorScheme } from 'nativewind'
import React, { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../hooks/useAuth'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL

interface JournalEntry {
  id: string
  title: string
  content: string
  imageUri?: string
  audioUri?: string
  createdAt: string // Changed from Date to string since API returns formatted string
}

// API functions
const fetchJournalEntries = async (token: string): Promise<JournalEntry[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/journal`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch entries: ${response.status} ${errorText}`)
    }

    const data = await response.json()

    // Handle different response structures
    const entries = Array.isArray(data) ? data : (data.data || data.entries || [])

    return entries.map((entry: any) => {
      // Handle different possible property names for media
      const imageUri = entry.imageUrl || entry.imageUri || entry.image_uri || entry.image || entry.image_url
      const audioUri = entry.voiceNoteUrl || entry.audioUri || entry.audio_uri || entry.audio || entry.audioUrl || entry.audio_url



      return {
        ...entry,
        createdAt: entry.createdAt || entry.created_at || 'Unknown date', // Keep as string
        imageUri,
        audioUri
      }
    })
  } catch (error) {
    throw error
  }
}

const createJournalEntry = async (entry: Omit<JournalEntry, 'id' | 'createdAt'>, token: string): Promise<JournalEntry> => {
  try {
    const formData = new FormData()
    formData.append('title', entry.title)
    formData.append('content', entry.content)

    // Handle image upload
    if (entry.imageUri) {
      const imageResponse = await fetch(entry.imageUri)
      const imageBlob = await imageResponse.blob()
      formData.append('image', imageBlob as any, 'image.jpg')
    }

    // Handle audio upload
    if (entry.audioUri) {
      const audioResponse = await fetch(entry.audioUri)
      const audioBlob = await audioResponse.blob()
      formData.append('audio', audioBlob as any, 'audio.m4a')
    }

    const response = await fetch(`${API_BASE_URL}/journal`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
        // Note: Don't set Content-Type for FormData, let the browser set it with boundary
      },
    })

    if (!response.ok) {
      throw new Error('Failed to create entry')
    }

    const data = await response.json()

    return {
      ...data,
      createdAt: data.createdAt || data.created_at || 'Just now'
    }
  } catch (error) {
    throw error
  }
}

const PrivateJournalScreen = () => {
  const { token } = useAuth()
  const { colorScheme } = useColorScheme()
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null)
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [entries, setEntries] = useState<JournalEntry[]>([])

  const recordingRef = useRef<Audio.Recording | null>(null)
  const hasLoadedRef = useRef(false)
  const lastRefreshRef = useRef<number>(0)

  // Load entries when token is available
  useEffect(() => {
    const loadEntries = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const fetchedEntries = await fetchJournalEntries(token)
        setEntries(fetchedEntries)
        hasLoadedRef.current = true
      } catch (error) {
        Alert.alert('Error', 'Failed to load journal entries')
      } finally {
        setIsLoading(false)
      }
    }

    loadEntries()
  }, [token])

  // Refresh entries when returning from edit screen - but only if needed
  // Commenting out for now to prevent date issues
  // useFocusEffect(
  //   useCallback(() => {
  //     // Only refresh if we've loaded before and have a token
  //     if (hasLoadedRef.current && token) {
  //       const refreshEntries = async () => {
  //         try {
  //           const fetchedEntries = await fetchJournalEntries(token)
  //           setEntries(fetchedEntries)
  //         } catch (error) {
  //           // Silently fail on refresh to avoid annoying the user
  //           console.log('Failed to refresh entries:', error)
  //         }
  //       }
  //       refreshEntries()
  //     }
  //   }, [token])
  // )

  const resetForm = () => {
    setTitle('')
    setContent('')
    setSelectedImageUri(null)
    setAudioUri(null)
  }

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in both title and content')
      return
    }

    if (!token) {
      Alert.alert('Error', 'Authentication required')
      return
    }

    setIsSaving(true)

    try {
      const entryData = {
        title: title.trim(),
        content: content.trim(),
        imageUri: selectedImageUri || undefined,
        audioUri: audioUri || undefined,
      }

      const newEntry = await createJournalEntry(entryData, token)

      setEntries(prev => [newEntry, ...prev])
      resetForm()
      setIsNewEntryOpen(false)
      Alert.alert('Success', 'Journal entry saved!')
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to add photos')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })

    if (!result.canceled) {
      setSelectedImageUri(result.assets[0].uri)
    }
  }

  const handleStartRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync()

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone permissions to record voice notes')
        return
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const recording = new Audio.Recording()
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      await recording.startAsync()

      recordingRef.current = recording
      setIsRecording(true)
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording')
    }
  }

  const handleStopRecording = async () => {
    try {
      if (!recordingRef.current) return

      setIsRecording(false)
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()

      if (uri) {
        setAudioUri(uri)
      }

      recordingRef.current = null
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording')
    }
  }

  const removeImage = () => setSelectedImageUri(null)
  const removeAudio = () => setAudioUri(null)

  const styles = createStyles(currentTheme)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Your Private Journal</Text>
            <Text style={styles.subtitle}>A safe space to capture every moment, thought, and feeling.</Text>
          </View>
          <TouchableOpacity
            style={styles.newEntryButton}
            onPress={() => setIsNewEntryOpen(true)}
          >
            <Ionicons name="add-circle" size={24} color={currentTheme.primaryForeground} />
            <Text style={styles.newEntryButtonText}>New Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Journal Entries */}
        <View style={styles.entriesContainer}>
          {isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="refresh" size={64} color={currentTheme.mutedForeground} />
              <Text style={styles.emptyStateText}>Loading entries...</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={64} color={currentTheme.mutedForeground} />
              <Text style={styles.emptyStateText}>No entries yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap "New Entry" to start journaling</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                onPress={() => router.push({
                  pathname: `/journal/[entryId]`,
                  params: {
                    entryId: entry.id,
                    title: entry.title,
                    content: entry.content,
                    imageUri: entry.imageUri || '',
                    audioUri: entry.audioUri || '',
                    createdAt: entry.createdAt
                  }
                })}
                activeOpacity={0.7}
              >
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  <View style={styles.mediaIndicators}>
                    {entry.imageUri && (
                      <View style={styles.mediaIndicator}>
                        <Ionicons name="image" size={16} color={currentTheme.primary} />
                      </View>
                    )}
                    {entry.audioUri && (
                      <View style={styles.mediaIndicator}>
                        <Ionicons name="mic" size={16} color={currentTheme.primary} />
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.entryContent} numberOfLines={3}>{entry.content}</Text>
                <View style={styles.entryFooter}>
                  <Text style={styles.entryDate}>
                    {entry.createdAt || 'Date unavailable'}
                  </Text>
                  <View style={styles.editIndicator}>
                    <Ionicons name="chevron-forward" size={16} color={currentTheme.mutedForeground} />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* New Entry Modal */}
      <Modal
        visible={isNewEntryOpen}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              resetForm()
              setIsNewEntryOpen(false)
            }}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Journal Entry</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            >
              <Text style={[styles.saveButtonText, isSaving && styles.saveButtonTextDisabled]}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSubtitle}>What's on your mind and in your heart today?</Text>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="e.g., A special moment, a worry, a dream..."
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#999"
              />
            </View>

            {/* Content Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your thoughts</Text>
              <TextInput
                style={styles.contentInput}
                placeholder="Let it all flow..."
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
            </View>

            {/* Media Buttons */}
            <View style={styles.mediaButtons}>
              <TouchableOpacity style={styles.mediaButton} onPress={handleImagePicker}>
                <Ionicons name="image" size={20} color={currentTheme.primary} />
                <Text style={styles.mediaButtonText}>
                  {selectedImageUri ? 'Change photo' : 'Add photo'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mediaButton, isRecording && styles.recordingButton]}
                onPress={isRecording ? handleStopRecording : handleStartRecording}
              >
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={20}
                  color={isRecording ? "white" : currentTheme.primary}
                />
                <Text style={[styles.mediaButtonText, isRecording && styles.recordingButtonText]}>
                  {isRecording ? 'Stop Recording' : 'Record voice note'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Image Preview */}
            {selectedImageUri && (
              <View style={styles.previewContainer}>
                <Text style={styles.label}>Photo Preview</Text>
                <View style={styles.imagePreview}>
                  <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Audio Preview */}
            {audioUri && (
              <View style={styles.previewContainer}>
                <Text style={styles.label}>Voice Note</Text>
                <View style={styles.audioPreview}>
                  <Ionicons name="mic" size={24} color={currentTheme.primary} />
                  <Text style={styles.audioText}>Voice note recorded</Text>
                  <TouchableOpacity style={styles.removeAudioButton} onPress={removeAudio}>
                    <Ionicons name="close" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

export default PrivateJournalScreen

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.foreground,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.mutedForeground,
    marginBottom: 20,
  },
  newEntryButton: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  newEntryButtonText: {
    color: theme.primaryForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  entriesContainer: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.mutedForeground,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.mutedForeground,
    marginTop: 4,
  },
  entryCard: {
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
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.cardForeground,
    flex: 1,
    marginRight: 12,
  },
  mediaIndicators: {
    flexDirection: 'row',
    gap: 6,
  },
  mediaIndicator: {
    backgroundColor: theme.muted,
    borderRadius: 16,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryContent: {
    fontSize: 14,
    color: theme.cardForeground,
    lineHeight: 20,
    marginBottom: 12,
  },
  entryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  entryDate: {
    fontSize: 12,
    color: theme.mutedForeground,
    flex: 1,
  },
  editIndicator: {
    padding: 4,
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
    fontSize: 14,
    color: theme.mutedForeground,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.foreground,
    marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: theme.card,
    color: theme.cardForeground,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: theme.card,
    color: theme.cardForeground,
    minHeight: 120,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  mediaButton: {
    flex: 1,
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
  recordingButton: {
    backgroundColor: theme.destructive,
    borderColor: theme.destructive,
  },
  mediaButtonText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  recordingButtonText: {
    color: theme.destructiveForeground,
  },
  previewContainer: {
    marginBottom: 20,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
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
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.muted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  audioText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: theme.mutedForeground,
  },
  removeAudioButton: {
    padding: 4,
  },
})