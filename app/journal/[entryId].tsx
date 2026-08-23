import themes from '@/constants/colors'
import { DEFAULT_CATEGORY, getCategoryConfig, JOURNAL_CATEGORIES, JournalCategory, PREDEFINED_TAGS } from '@/constants/journalCategories'
import { useAuth } from '@/context/AuthContext'
import { Audio } from 'expo-av'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, Check, ChevronDown, Edit3, ImageIcon, Play, StopCircle, Trash2, X } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import React, { useEffect, useMemo, useState } from 'react'
import {
    Alert,
    Image,
    KeyboardAvoidingView,
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
    audioUri?: string
    category?: string
    tags?: string[]
    createdAt: string // Changed from Date to string since API returns formatted string
}

// API functions
const updateJournalEntry = async (entryId: string, updates: { title: string; content: string; category?: string; tags?: string[] }, token: string): Promise<JournalEntry> => {
    try {
        const response = await fetch(`${API_BASE_URL}/journal/${entryId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        })

        if (!response.ok) {
            throw new Error(`Failed to update entry: ${response.status}`)
        }

        const data = await response.json()

        return {
            ...data,
            createdAt: data.createdAt || data.created_at || 'Unknown date',
            category: data.category || 'General',
            tags: data.tags || []
        }
    } catch (error) {
        throw error
    }
}

const deleteJournalEntry = async (entryId: string, token: string): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/journal/${entryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to delete entry: ${response.status}`)
        }
    } catch (error) {
        throw error
    }
}

// Route params get URL-decoded by expo-router, which turns the encoded slashes
// (%2F) in a Firebase Storage object path back into literal slashes and breaks
// the signed download URL. Re-encode the object path segment to restore it.
const fixFirebaseStorageUri = (uri: string): string => {
    const marker = '/o/'
    const markerIndex = uri.indexOf(marker)
    if (markerIndex === -1) {
        return uri
    }

    const pathStart = markerIndex + marker.length
    const queryIndex = uri.indexOf('?', pathStart)
    const pathEnd = queryIndex === -1 ? uri.length : queryIndex

    const objectPath = uri.slice(pathStart, pathEnd)
    const fixedObjectPath = objectPath.split('/').join('%2F')

    return uri.slice(0, pathStart) + fixedObjectPath + uri.slice(pathEnd)
}

const JournalEntryEdit = () => {
    const params = useLocalSearchParams<{
        entryId: string
        title: string
        content: string
        imageUri?: string
        audioUri?: string
        category?: string
        tags?: string
        createdAt: string
    }>()

    const { session } = useAuth()
    const token = session?.accessToken
    const { colorScheme } = useColorScheme()
    const currentTheme = themes[colorScheme || 'light'] ?? themes.light

    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<JournalCategory>(DEFAULT_CATEGORY)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [customTag, setCustomTag] = useState('')
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [entry, setEntry] = useState<JournalEntry | null>(null)
    const [sound, setSound] = useState<Audio.Sound | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [imageLoading, setImageLoading] = useState(true)
    const [imageError, setImageError] = useState(false)

    const handleTitleChange = (text: string) => {
        setTitle(text)
    }

    const handleContentChange = (text: string) => {
        setContent(text)
    }

    // Memoize entry data to prevent infinite re-renders
    const entryData = useMemo(() => {
        if (params.entryId && params.title && params.content) {

            // Parse tags from JSON string
            let parsedTags: string[] = []
            if (params.tags) {
                try {
                    parsedTags = JSON.parse(params.tags)
                } catch (error) {
                    console.error('Failed to parse tags:', error)
                    parsedTags = []
                }
            }

            return {
                id: params.entryId,
                title: params.title,
                content: params.content,
                imageUri: params.imageUri && params.imageUri.trim() !== '' ? fixFirebaseStorageUri(params.imageUri) : undefined,
                audioUri: params.audioUri && params.audioUri.trim() !== '' ? params.audioUri : undefined,
                category: params.category || 'General',
                tags: parsedTags,
                createdAt: params.createdAt || 'Unknown date'
            }
        }
        return null
    }, [params.entryId, params.title, params.content, params.imageUri, params.audioUri, params.category, params.tags, params.createdAt])

    useEffect(() => {
        if (entryData) {

            setEntry(entryData)
            setTitle(entryData.title)
            setContent(entryData.content)
            setSelectedCategory(entryData.category as JournalCategory || DEFAULT_CATEGORY)
            setSelectedTags(entryData.tags || [])
        } else if (params.entryId) {
            // If no params, go back (shouldn't happen in normal flow)
            Alert.alert('Error', 'Entry data not found', [
                { text: 'OK', onPress: () => router.back() }
            ])
        }
    }, [entryData, params.entryId])

    // Setup audio mode on mount and cleanup on unmount
    useEffect(() => {
        const setupAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                })
            } catch (error) {
                console.error('Error setting up audio mode:', error)
            }
        }

        setupAudio()

        return () => {
            if (sound) {
                sound.unloadAsync().catch(console.error)
            }
        }
    }, [sound])

    const handleEdit = () => {
        setIsEditing(true)
    }

    const handleCancelEdit = () => {
        // Reset to original values
        if (entryData) {
            setTitle(entryData.title)
            setContent(entryData.content)
            setSelectedCategory(entryData.category as JournalCategory || DEFAULT_CATEGORY)
            setSelectedTags(entryData.tags || [])
        }
        setCustomTag('')
        setIsEditing(false)
    }

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

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) {
            Alert.alert('Error', 'Please fill in both title and content')
            return
        }

        if (!token || !params.entryId) {
            Alert.alert('Error', 'Authentication required')
            return
        }

        setIsSaving(true)

        try {
            const updates = {
                title: title.trim(),
                content: content.trim(),
                category: selectedCategory,
                tags: selectedTags,
            }

            await updateJournalEntry(params.entryId, updates, token)
            
            // Update the entry state with new values
            if (entryData) {
                setEntry({
                    ...entryData,
                    title: title.trim(),
                    content: content.trim(),
                    category: selectedCategory,
                    tags: selectedTags,
                })
            }
            
            setIsEditing(false)
            Alert.alert('Success', 'Journal entry updated!')
        } catch (error) {
            Alert.alert('Error', 'Failed to update entry. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        Alert.alert(
            'Delete Entry',
            'Are you sure you want to delete this journal entry? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!token || !params.entryId) return

                        setIsDeleting(true)

                        try {
                            await deleteJournalEntry(params.entryId, token)
                            Alert.alert('Success', 'Journal entry deleted!', [
                                { text: 'OK', onPress: () => router.back() }
                            ])
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete entry. Please try again.')
                        } finally {
                            setIsDeleting(false)
                        }
                    }
                }
            ]
        )
    }

    const playAudio = async () => {
        if (!entry?.audioUri) {
            Alert.alert('Error', 'No audio file found')
            return
        }

        try {

            // Request audio permissions (might be needed for some platforms)
            const { status } = await Audio.requestPermissionsAsync()
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant audio permissions to play voice notes')
                return
            }

            // Set up audio mode for playback
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            })

            // Clean up existing sound
            if (sound) {
                await sound.unloadAsync()
                setSound(null)
            }


            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: entry.audioUri },
                {
                    shouldPlay: false,
                    isLooping: false,
                    volume: 1.0,
                }
            )


            // Check if sound loaded successfully
            const initialStatus = await newSound.getStatusAsync()

            if (!initialStatus.isLoaded) {
                await newSound.unloadAsync()
                throw new Error('Audio file could not be loaded. The file might be corrupted or in an unsupported format.')
            }

            // Start playing
            await newSound.playAsync()

            setSound(newSound)
            setIsPlaying(true)

            // Set up status listener
            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    if (status.didJustFinish) {
                        setIsPlaying(false)
                    }
                } else if (status.error) {
                    console.error('Audio playback error:', status.error)
                    setIsPlaying(false)
                    Alert.alert('Playback Error', `Audio playback failed: ${status.error}`)
                }
            })


        } catch (error: any) {
            console.error('Audio play error:', error)
            setIsPlaying(false)

            let errorMessage = 'Unknown error occurred'
            if (error.message) {
                errorMessage = error.message
            } else if (typeof error === 'string') {
                errorMessage = error
            }

            Alert.alert('Audio Error', `Failed to play audio: ${errorMessage}`)
        }
    }

    const stopAudio = async () => {
        try {
            if (sound) {
                await sound.stopAsync()
                setIsPlaying(false)
            }
        } catch (error) {
            console.error('Error stopping audio:', error)
            setIsPlaying(false)
        }
    }

    const styles = createStyles(currentTheme)

    if (!entry) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading entry...</Text>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft size={24} color={currentTheme.foreground} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEditing ? 'Edit Entry' : 'Journal Entry'}
                </Text>
                <TouchableOpacity
                    onPress={handleDelete}
                    disabled={isDeleting || isEditing}
                    style={[styles.deleteButton, (isDeleting || isEditing) && styles.deleteButtonDisabled]}
                >
                    <Trash2
                        size={20}
                        color={(isDeleting || isEditing) ? currentTheme.mutedForeground : currentTheme.destructive}
                    />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={100}
            >
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 20 }}
                >
                    {/* Entry Info */}
                    <View style={styles.entryInfo}>
                        <Text style={styles.entryDate}>
                            Created: {entry.createdAt || 'Date unavailable'}
                        </Text>
                    </View>

                {/* Photo Display */}
                {entry.imageUri && (
                    <View style={styles.mediaSection}>
                        <Text style={styles.mediaSectionTitle}>Photo</Text>
                        <View style={styles.imageContainer}>
                            {imageLoading && !imageError && (
                                <View style={styles.imageLoadingContainer}>
                                    <Text style={styles.imageLoadingText}>Loading image...</Text>
                                </View>
                            )}
                            {imageError ? (
                                <View style={styles.imageErrorContainer}>
                                    <ImageIcon size={48} color={currentTheme.mutedForeground} />
                                    <Text style={styles.imageErrorText}>Image unavailable</Text>
                                </View>
                            ) : (
                                <Image
                                    source={{ uri: entry.imageUri }}
                                    style={styles.entryImage}
                                    onLoad={() => {
                                        setImageLoading(false)
                                        setImageError(false)
                                    }}
                                    onError={(error) => {
                                        console.error('❌ Image load error for entry:', entry.id)
                                        console.error('Error details:', error.nativeEvent)
                                        console.error('Image URL:', entry.imageUri)
                                        setImageLoading(false)
                                        setImageError(true)
                                    }}
                                    onLoadStart={() => {
                                        setImageLoading(true)
                                        setImageError(false)
                                    }}
                                    resizeMode="cover"
                                    fadeDuration={300}
                                />
                            )}
                        </View>
                    </View>
                )}

                {/* Voice Note Display */}
                {entry.audioUri && (
                    <View style={styles.mediaSection}>
                        <Text style={styles.mediaSectionTitle}>Voice Note</Text>
                        <View style={styles.audioContainer}>
                            <TouchableOpacity
                                style={styles.audioButton}
                                onPress={isPlaying ? stopAudio : playAudio}
                            >
                                {isPlaying ? (
                                    <StopCircle size={24} color={currentTheme.primaryForeground} />
                                ) : (
                                    <Play size={24} color={currentTheme.primaryForeground} />
                                )}
                            </TouchableOpacity>
                            <View style={styles.audioInfo}>
                                <Text style={styles.audioText}>
                                    {isPlaying ? 'Playing voice note...' : 'Tap to play voice note'}
                                </Text>
                                <Text style={styles.audioSubtext}>
                                    Voice recording attached to this entry
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {isEditing ? (
                    <>
                        {/* Title Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                key={`title-${entry.id}`}
                                style={styles.titleInput}
                                placeholder="Entry title..."
                                value={title}
                                onChangeText={handleTitleChange}
                                placeholderTextColor={currentTheme.mutedForeground}
                                editable={!isSaving}
                                selectTextOnFocus={true}
                                autoCorrect={true}
                                spellCheck={true}
                            />
                        </View>

                        {/* Content Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Content</Text>
                            <TextInput
                                key={`content-${entry.id}`}
                                style={styles.contentInput}
                                placeholder="Your thoughts..."
                                value={content}
                                onChangeText={handleContentChange}
                                multiline
                                textAlignVertical="top"
                                placeholderTextColor={currentTheme.mutedForeground}
                                editable={!isSaving}
                                selectTextOnFocus={true}
                                autoCorrect={true}
                                spellCheck={true}
                                scrollEnabled={false}
                            />
                        </View>

                        {/* Category Selector */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Category</Text>
                            <TouchableOpacity
                                style={styles.dropdownButton}
                                onPress={() => !isSaving && setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                disabled={isSaving}
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
                            
                            {isCategoryDropdownOpen && !isSaving && (
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
                                            disabled={isSaving}
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
                                    placeholderTextColor={currentTheme.mutedForeground}
                                    maxLength={20}
                                    onSubmitEditing={addCustomTag}
                                    returnKeyType="done"
                                    editable={!isSaving}
                                />
                                <TouchableOpacity
                                    style={[styles.addTagButton, (!customTag.trim() || isSaving) && styles.addTagButtonDisabled]}
                                    onPress={addCustomTag}
                                    disabled={!customTag.trim() || isSaving}
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
                                                <TouchableOpacity onPress={() => removeTag(tag)} disabled={isSaving}>
                                                    <X size={14} color="white" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Edit Action Buttons */}
                        <View style={styles.editActions}>
                            <TouchableOpacity
                                onPress={handleCancelEdit}
                                disabled={isSaving}
                                style={[styles.cancelButton, isSaving && styles.cancelButtonDisabled]}
                            >
                                <Text style={[styles.cancelButtonText, isSaving && styles.cancelButtonTextDisabled]}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={isSaving}
                                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                            >
                                <Text style={[styles.saveButtonText, isSaving && styles.saveButtonTextDisabled]}>
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <>
                        {/* Read-only Title */}
                        <View style={styles.readOnlySection}>
                            <Text style={styles.label}>Title</Text>
                            <View style={styles.readOnlyContainer}>
                                <Text style={styles.readOnlyTitle}>{title}</Text>
                            </View>
                        </View>

                        {/* Read-only Content */}
                        <View style={styles.readOnlySection}>
                            <Text style={styles.label}>Content</Text>
                            <View style={styles.readOnlyContainer}>
                                <Text style={styles.readOnlyContent}>{content}</Text>
                            </View>
                        </View>

                        {/* Read-only Category */}
                        <View style={styles.readOnlySection}>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.readOnlyContainer}>
                                {(() => {
                                    const categoryConfig = getCategoryConfig(selectedCategory)
                                    const CategoryIcon = categoryConfig.icon
                                    return (
                                        <View style={[
                                            styles.categoryBadge,
                                            { backgroundColor: categoryConfig.lightColor }
                                        ]}>
                                            <CategoryIcon size={14} color={categoryConfig.color} />
                                            <Text style={[styles.categoryBadgeText, { color: categoryConfig.color }]}>
                                                {categoryConfig.label}
                                            </Text>
                                        </View>
                                    )
                                })()}
                            </View>
                        </View>

                        {/* Read-only Tags */}
                        {selectedTags.length > 0 && (
                            <View style={styles.readOnlySection}>
                                <Text style={styles.label}>Tags</Text>
                                <View style={styles.readOnlyContainer}>
                                    <View style={styles.tagsContainer}>
                                        {selectedTags.map((tag) => (
                                            <View key={tag} style={styles.selectedTag}>
                                                <Text style={styles.selectedTagText}>{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Edit Button */}
                        <TouchableOpacity
                            onPress={handleEdit}
                            style={styles.editButton}
                        >
                            <Edit3 size={20} color={currentTheme.primaryForeground} />
                            <Text style={styles.editButtonText}>Edit Entry</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default JournalEntryEdit

const createStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.foreground,
    },
    deleteButton: {
        padding: 8,
    },
    deleteButtonDisabled: {
        opacity: 0.5,
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
    entryInfo: {
        backgroundColor: theme.muted,
        padding: 16,
        borderRadius: 8,
        marginBottom: 20,
    },
    entryDate: {
        fontSize: 14,
        color: theme.mutedForeground,
    },
    mediaSection: {
        marginBottom: 20,
    },
    mediaSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.foreground,
        marginBottom: 12,
    },
    imageContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: theme.muted,
    },
    entryImage: {
        width: '100%',
        height: 250,
        resizeMode: 'cover',
    },
    audioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
    },
    audioButton: {
        backgroundColor: theme.primary,
        borderRadius: 25,
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    audioInfo: {
        flex: 1,
    },
    audioText: {
        fontSize: 16,
        color: theme.cardForeground,
        fontWeight: '500',
        marginBottom: 4,
    },
    audioSubtext: {
        fontSize: 14,
        color: theme.mutedForeground,
    },
    inputGroup: {
        marginBottom: 20,
    },
    readOnlySection: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.foreground,
        marginBottom: 8,
    },
    readOnlyContainer: {
        backgroundColor: theme.muted,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
    },
    readOnlyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.foreground,
        lineHeight: 24,
    },
    readOnlyContent: {
        fontSize: 16,
        color: theme.foreground,
        lineHeight: 24,
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
        minHeight: 200,
    },
    editButton: {
        backgroundColor: theme.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 8,
        marginBottom: 40,
        gap: 8,
    },
    editButtonText: {
        color: theme.primaryForeground,
        fontSize: 16,
        fontWeight: '600',
    },
    editActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 40,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: theme.muted,
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.border,
    },
    cancelButtonDisabled: {
        opacity: 0.5,
    },
    cancelButtonText: {
        color: theme.foreground,
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButtonTextDisabled: {
        color: theme.mutedForeground,
    },
    saveButton: {
        flex: 1,
        backgroundColor: theme.primary,
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
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
    debugText: {
        fontSize: 12,
        color: theme.mutedForeground,
        marginTop: 8,
        fontFamily: 'monospace',
    },
    imageLoadingContainer: {
        width: '100%',
        height: 250,
        backgroundColor: theme.muted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageLoadingText: {
        color: theme.mutedForeground,
        fontSize: 16,
    },
    imageErrorContainer: {
        width: '100%',
        height: 250,
        backgroundColor: theme.muted,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    imageErrorText: {
        color: theme.mutedForeground,
        fontSize: 16,
        marginTop: 8,
        textAlign: 'center',
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
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 4,
    },
    categoryBadgeText: {
        fontSize: 13,
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