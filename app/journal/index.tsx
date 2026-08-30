import themes from '@/constants/colors'
import { DEFAULT_CATEGORY, JOURNAL_CATEGORIES, JournalCategory, PREDEFINED_TAGS } from '@/constants/journalCategories'
import { useAuth } from '@/context/AuthContext'
import { Audio } from 'expo-av'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { BookOpen, Check, ChevronDown, ChevronRight, ImageIcon, Mic, MicOff, Plus, RefreshCw, StopCircle, X } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import React, { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL

interface JournalEntry {
  id: string
  title: string
  content: string
  imageUri?: string
  imageMimeType?: string
  audioUri?: string
  category?: string
  tags?: string[]
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
        audioUri,
        category: entry.category || 'General',
        tags: entry.tags || []
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
    
    // Add category and tags
    if (entry.category) {
      formData.append('category', entry.category)
    }
    if (entry.tags && entry.tags.length > 0) {
      formData.append('tags', JSON.stringify(entry.tags))
    }

    // Handle image upload — append the local file URI directly (RN's FormData
    // knows how to stream a `{ uri, type, name }` part). Round-tripping through
    // fetch().blob() first is unreliable for local file:// URIs on RN and can
    // silently produce an empty blob, which is why images were being dropped.
    if (entry.imageUri) {
      formData.append('picture', {
        uri: entry.imageUri,
        type: entry.imageMimeType || 'image/jpeg',
        name: 'image.jpg',
      } as any)
    }

    // Handle audio upload — expo-av's HIGH_QUALITY preset always outputs .m4a
    // on both iOS and Android.
    if (entry.audioUri) {
      formData.append('voiceNote', {
        uri: entry.audioUri,
        type: 'audio/m4a',
        name: 'audio.m4a',
      } as any)
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
      imageUri: data.imageUrl || data.imageUri,
      audioUri: data.voiceNoteUrl || data.audioUri,
      createdAt: data.createdAt || data.created_at || 'Just now'
    }
  } catch (error) {
    throw error
  }
}

const PrivateJournalScreen = () => {
  const { session } = useAuth();
  const token = session?.accessToken;
  const { colorScheme } = useColorScheme()
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null)
  const [selectedImageMimeType, setSelectedImageMimeType] = useState<string | null>(null)
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<JournalCategory>(DEFAULT_CATEGORY)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [activeFilter, setActiveFilter] = useState<JournalCategory | 'All'>('All')
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const [entries, setEntries] = useState<JournalEntry[]>([])

  const recordingRef = useRef<Audio.Recording | null>(null)
  const hasLoadedRef = useRef(false)
  const lastRefreshRef = useRef<number>(0)
  const [isListeningContent, setIsListeningContent] = useState(false)
  const pulseAnimContent = useRef(new Animated.Value(1)).current
  const pulseLoopContent = useRef<Animated.CompositeAnimation | null>(null)
  const acceptSpeechResultsContent = useRef(false)
  const speechBaseTextContent = useRef('')
  const [isListeningTitle, setIsListeningTitle] = useState(false)
  const pulseAnimTitle = useRef(new Animated.Value(1)).current
  const pulseLoopTitle = useRef<Animated.CompositeAnimation | null>(null)
  const acceptSpeechResultsTitle = useRef(false)
  const speechBaseTextTitle = useRef('')

  const startContentPulse = () => {
    pulseLoopContent.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimContent, { toValue: 1.35, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnimContent, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    )
    pulseLoopContent.current.start()
  }

  const stopContentPulse = () => {
    pulseLoopContent.current?.stop()
    pulseAnimContent.setValue(1)
  }

  const startTitlePulse = () => {
    pulseLoopTitle.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimTitle, { toValue: 1.35, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnimTitle, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    )
    pulseLoopTitle.current.start()
  }

  const stopTitlePulse = () => {
    pulseLoopTitle.current?.stop()
    pulseAnimTitle.setValue(1)
  }

  const toggleTitleSpeech = async () => {
    if (isListeningTitle) {
      acceptSpeechResultsTitle.current = false
      ExpoSpeechRecognitionModule.stop()
      setIsListeningTitle(false)
      stopTitlePulse()
      return
    }

    const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync()

    if (status !== 'granted') {
      Alert.alert(
        'Microphone Permission Required',
        'Please allow microphone access to use voice input.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      )
      return
    }

    speechBaseTextTitle.current = title
    acceptSpeechResultsTitle.current = true
    setIsListeningTitle(true)
    startTitlePulse()
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false })
  }

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? ''
    if (!transcript) return
    if (acceptSpeechResultsTitle.current) {
      const base = speechBaseTextTitle.current
      setTitle(base.trim().length === 0 ? transcript : base.trimEnd() + ' ' + transcript)
    } else if (acceptSpeechResultsContent.current) {
      const base = speechBaseTextContent.current
      setContent(base.trim().length === 0 ? transcript : base.trimEnd() + ' ' + transcript)
    }
  })

  useSpeechRecognitionEvent('error', (event) => {
    if (!acceptSpeechResultsTitle.current && !acceptSpeechResultsContent.current) return
    console.warn('Speech recognition error:', event.error, event.message)
    if (event.error !== 'aborted') {
      Alert.alert('Speech Error', event.message || 'Speech recognition failed. Please try again.')
    }
    if (acceptSpeechResultsTitle.current) {
      setIsListeningTitle(false)
      stopTitlePulse()
    } else {
      setIsListeningContent(false)
      stopContentPulse()
    }
  })

  useSpeechRecognitionEvent('end', () => {
    if (acceptSpeechResultsTitle.current) {
      acceptSpeechResultsTitle.current = false
      setIsListeningTitle(false)
      stopTitlePulse()
    } else if (acceptSpeechResultsContent.current) {
      acceptSpeechResultsContent.current = false
      setIsListeningContent(false)
      stopContentPulse()
    }
  })

  const toggleContentSpeech = async () => {
    if (isListeningContent) {
      acceptSpeechResultsContent.current = false
      ExpoSpeechRecognitionModule.stop()
      setIsListeningContent(false)
      stopContentPulse()
      return
    }

    const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync()

    if (status !== 'granted') {
      Alert.alert(
        'Microphone Permission Required',
        'Please allow microphone access to use voice input.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      )
      return
    }

    speechBaseTextContent.current = content
    acceptSpeechResultsContent.current = true
    setIsListeningContent(true)
    startContentPulse()
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false })
  }

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


  const resetForm = () => {
    setTitle('')
    setContent('')
    setSelectedImageUri(null)
    setSelectedImageMimeType(null)
    setAudioUri(null)
    setSelectedCategory(DEFAULT_CATEGORY)
    setSelectedTags([])
    setCustomTag('')
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
        imageMimeType: selectedImageMimeType || undefined,
        audioUri: audioUri || undefined,
        category: selectedCategory,
        tags: selectedTags,
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
      setSelectedImageMimeType(result.assets[0].mimeType || 'image/jpeg')
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

  const removeImage = () => {
    setSelectedImageUri(null)
    setSelectedImageMimeType(null)
  }
  const removeAudio = () => setAudioUri(null)

  // Tag handling functions
  const togglePredefinedTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const addCustomTag = () => {
    const trimmedTag = customTag.trim()
    if (trimmedTag && trimmedTag.length <= 20 && !selectedTags.includes(trimmedTag)) {
      setSelectedTags(prev => [...prev, trimmedTag])
      setCustomTag('')
    } else if (selectedTags.includes(trimmedTag)) {
      Alert.alert('Duplicate Tag', 'This tag has already been added')
    } else if (trimmedTag.length > 20) {
      Alert.alert('Tag Too Long', 'Tags must be 20 characters or less')
    }
  }

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag))
  }

  // Filter entries by active category
  const filteredEntries = activeFilter === 'All' 
    ? entries 
    : entries.filter(entry => entry.category === activeFilter)

  const styles = createStyles(currentTheme)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Private Journal</Text>
          <Text style={styles.subtitle}>A safe space to capture every moment, thought, and feeling.</Text>
        </View>

        {/* Category Filter Chips */}
        {!isLoading && entries.length > 0 && (
          <View style={styles.filterSection}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsContainer}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  activeFilter === 'All' && styles.filterChipActive
                ]}
                onPress={() => setActiveFilter('All')}
              >
                <Text style={[
                  styles.filterChipText,
                  activeFilter === 'All' && styles.filterChipTextActive
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              
              {JOURNAL_CATEGORIES.map((category) => {
                const Icon = category.icon
                const isActive = activeFilter === category.value
                return (
                  <TouchableOpacity
                    key={category.value}
                    style={[
                      styles.filterChip,
                      { borderColor: category.color },
                      isActive && { backgroundColor: category.color }
                    ]}
                    onPress={() => setActiveFilter(category.value)}
                  >
                    <Icon 
                      size={14} 
                      color={isActive ? 'white' : category.color} 
                    />
                    <Text style={[
                      styles.filterChipText,
                      { color: isActive ? 'white' : category.color }
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* Journal Entries */}
        <View style={styles.entriesContainer}>
          {isLoading ? (
            <View style={styles.emptyState}>
              <RefreshCw size={64} color={currentTheme.mutedForeground} />
              <Text style={styles.emptyStateText}>Loading entries...</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.emptyState}>
              <BookOpen size={64} color={currentTheme.mutedForeground} />
              <Text style={styles.emptyStateText}>No entries yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap the + button to start journaling</Text>
            </View>
          ) : filteredEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <BookOpen size={64} color={currentTheme.mutedForeground} />
              <Text style={styles.emptyStateText}>No entries in this category</Text>
              <Text style={styles.emptyStateSubtext}>Try selecting a different filter</Text>
            </View>
          ) : (
            filteredEntries.map((entry) => {
              const categoryConfig = JOURNAL_CATEGORIES.find(c => c.value === entry.category) || JOURNAL_CATEGORIES[0]
              const CategoryIcon = categoryConfig.icon
              
              return (
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
                    category: entry.category || 'General',
                    tags: JSON.stringify(entry.tags || []),
                    createdAt: entry.createdAt
                  }
                })}
                activeOpacity={0.7}
              >
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  <View style={[
                    styles.categoryBadge,
                    { backgroundColor: categoryConfig.lightColor }
                  ]}>
                    <CategoryIcon size={12} color={categoryConfig.color} />
                    <Text style={[styles.categoryBadgeText, { color: categoryConfig.color }]}>
                      {categoryConfig.label}
                    </Text>
                  </View>
                </View>
                
                {/* Media Indicators */}
                {(entry.imageUri || entry.audioUri) && (
                  <View style={styles.mediaIndicatorsRow}>
                    {entry.imageUri && (
                      <View style={styles.mediaIndicator}>
                        <ImageIcon size={14} color={currentTheme.primary} />
                      </View>
                    )}
                    {entry.audioUri && (
                      <View style={styles.mediaIndicator}>
                        <Mic size={14} color={currentTheme.primary} />
                      </View>
                    )}
                  </View>
                )}
                
                {/* Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <View style={styles.entryTagsContainer}>
                    {entry.tags.map((tag, index) => (
                      <View key={index} style={styles.entryTagChip}>
                        <Text style={styles.entryTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                <Text style={styles.entryContent} numberOfLines={3}>{entry.content}</Text>
                <View style={styles.entryFooter}>
                  <Text style={styles.entryDate}>
                    {entry.createdAt || 'Date unavailable'}
                  </Text>
                  <View style={styles.editIndicator}>
                    <ChevronRight size={16} color={currentTheme.mutedForeground} />
                  </View>
                </View>
              </TouchableOpacity>
            )
            })
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

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={0}
          >
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>What's on your mind and in your heart today?</Text>

            {/* Category Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              >
                {(() => {
                  const selectedConfig = JOURNAL_CATEGORIES.find(c => c.value === selectedCategory) || JOURNAL_CATEGORIES[0]
                  const SelectedIcon = selectedConfig.icon
                  return (
                    <>
                      <View style={styles.dropdownButtonContent}>
                        <SelectedIcon size={18} color={selectedConfig.color} />
                        <Text style={[styles.dropdownButtonText, { color: selectedConfig.color }]}>
                          {selectedConfig.label}
                        </Text>
                      </View>
                      <ChevronDown size={20} color={currentTheme.mutedForeground} />
                    </>
                  )
                })()}
              </TouchableOpacity>
              
              {isCategoryDropdownOpen && (
                <ScrollView style={styles.dropdownMenu} nestedScrollEnabled={true}>
                  {JOURNAL_CATEGORIES.map((category) => {
                    const Icon = category.icon
                    const isSelected = selectedCategory === category.value
                    return (
                      <TouchableOpacity
                        key={category.value}
                        style={[
                          styles.dropdownItem,
                          isSelected && styles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setSelectedCategory(category.value)
                          setIsCategoryDropdownOpen(false)
                        }}
                      >
                        <Icon size={18} color={category.color} />
                        <Text style={[styles.dropdownItemText, { color: category.color }]}>
                          {category.label}
                        </Text>
                        {isSelected && <Check size={16} color={category.color} />}
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              )}
            </View>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[styles.titleInput, { paddingRight: 44 }, isListeningTitle && { borderColor: currentTheme.primary }]}
                  placeholder={isListeningTitle ? 'Listening…' : 'e.g., A special moment, a worry, a dream...'}
                  value={title}
                  onChangeText={setTitle}
                  placeholderTextColor={isListeningTitle ? currentTheme.primary : '#999'}
                />
                <TouchableOpacity
                  onPress={toggleTitleSpeech}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}
                >
                  <Animated.View style={{ transform: [{ scale: pulseAnimTitle }] }}>
                    {isListeningTitle ? (
                      <MicOff size={20} color={currentTheme.primary} />
                    ) : (
                      <Mic size={20} color={currentTheme.mutedForeground} />
                    )}
                  </Animated.View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Content Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your thoughts</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[styles.contentInput, { paddingBottom: 36 }, isListeningContent && { borderColor: currentTheme.primary }]}
                  placeholder={isListeningContent ? 'Listening…' : 'Let it all flow...'}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical="top"
                  placeholderTextColor={isListeningContent ? currentTheme.primary : '#999'}
                />
                <TouchableOpacity
                  onPress={toggleContentSpeech}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ position: 'absolute', bottom: 10, right: 12 }}
                >
                  <Animated.View style={{ transform: [{ scale: pulseAnimContent }] }}>
                    {isListeningContent ? (
                      <MicOff size={20} color={currentTheme.primary} />
                    ) : (
                      <Mic size={20} color={currentTheme.mutedForeground} />
                    )}
                  </Animated.View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tag Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tags (optional)</Text>
              
              {/* Predefined Tags */}
              <Text style={styles.subLabel}>Quick tags</Text>
              <View style={styles.tagsContainer}>
                {PREDEFINED_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagChip,
                        isSelected && styles.tagChipSelected
                      ]}
                      onPress={() => togglePredefinedTag(tag)}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          isSelected && styles.tagChipTextSelected
                        ]}
                      >
                        {tag}
                      </Text>
                      {isSelected && <Check size={12} color="white" />}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Custom Tag Input */}
              <Text style={[styles.subLabel, { marginTop: 12 }]}>Add custom tag</Text>
              <View style={styles.customTagContainer}>
                <TextInput
                  style={styles.customTagInput}
                  placeholder="Type a custom tag..."
                  value={customTag}
                  onChangeText={setCustomTag}
                  placeholderTextColor="#999"
                  maxLength={20}
                  onSubmitEditing={addCustomTag}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.addTagButton, !customTag.trim() && styles.addTagButtonDisabled]}
                  onPress={addCustomTag}
                  disabled={!customTag.trim()}
                >
                  <Text style={styles.addTagButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              {/* Selected Tags Display */}
              {selectedTags.length > 0 && (
                <>
                  <Text style={[styles.subLabel, { marginTop: 12 }]}>
                    Selected tags ({selectedTags.length})
                  </Text>
                  <View style={styles.tagsContainer}>
                    {selectedTags.map((tag) => (
                      <View
                        key={tag}
                        style={styles.selectedTag}
                      >
                        <Text style={styles.selectedTagText}>{tag}</Text>
                        <TouchableOpacity onPress={() => removeTag(tag)}>
                          <X size={14} color="white" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* Media Buttons */}
            <View style={styles.mediaButtons}>
              <TouchableOpacity style={styles.mediaButton} onPress={handleImagePicker}>
                <ImageIcon size={20} color={currentTheme.primary} />
                <Text style={styles.mediaButtonText}>
                  {selectedImageUri ? 'Change photo' : 'Add photo'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mediaButton, isRecording && styles.recordingButton]}
                onPress={isRecording ? handleStopRecording : handleStartRecording}
              >
                {isRecording ? (
                  <StopCircle size={20} color="white" />
                ) : (
                  <Mic size={20} color={currentTheme.primary} />
                )}
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
                    <X size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Audio Preview */}
            {audioUri && (
              <View style={styles.previewContainer}>
                <Text style={styles.label}>Voice Note</Text>
                <View style={styles.audioPreview}>
                  <Mic size={24} color={currentTheme.primary} />
                  <Text style={styles.audioText}>Voice note recorded</Text>
                  <TouchableOpacity style={styles.removeAudioButton} onPress={removeAudio}>
                    <X size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsNewEntryOpen(true)}
        activeOpacity={0.8}
      >
        <Plus size={32} strokeWidth={3} color={currentTheme.primaryForeground} />
      </TouchableOpacity>
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
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterChipsContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.background,
    gap: 6,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.foreground,
  },
  filterChipTextActive: {
    color: theme.primaryForeground,
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
  mediaIndicatorsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  mediaIndicator: {
    backgroundColor: theme.muted,
    borderRadius: 16,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  entryTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  entryTagChip: {
    backgroundColor: theme.muted,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  entryTagText: {
    fontSize: 11,
    color: theme.mutedForeground,
    fontWeight: '500',
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
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.card,
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.card,
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dropdownItemSelected: {
    backgroundColor: theme.muted,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.mutedForeground,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.muted,
    gap: 4,
  },
  tagChipSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  tagChipText: {
    fontSize: 13,
    color: theme.foreground,
  },
  tagChipTextSelected: {
    color: theme.primaryForeground,
  },
  customTagContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  customTagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: theme.card,
    color: theme.cardForeground,
  },
  addTagButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagButtonDisabled: {
    backgroundColor: theme.muted,
    opacity: 0.5,
  },
  addTagButtonText: {
    color: theme.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: theme.primary,
    gap: 6,
  },
  selectedTagText: {
    fontSize: 13,
    color: theme.primaryForeground,
  },
})