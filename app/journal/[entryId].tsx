import themes from '@/constants/colors'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { router, useLocalSearchParams } from 'expo-router'
import { useColorScheme } from 'nativewind'
import React, { useEffect, useMemo, useState } from 'react'
import {
    Alert,
    Image,
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
const updateJournalEntry = async (entryId: string, updates: { title: string; content: string }, token: string): Promise<JournalEntry> => {
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
            createdAt: data.createdAt || data.created_at || 'Unknown date'
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

const JournalEntryEdit = () => {
    const params = useLocalSearchParams<{
        entryId: string
        title: string
        content: string
        imageUri?: string
        audioUri?: string
        createdAt: string
    }>()

    const { token } = useAuth()
    const { colorScheme } = useColorScheme()
    const currentTheme = themes[colorScheme || 'light'] ?? themes.light

    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
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
           
            
            return {
                id: params.entryId,
                title: params.title,
                content: params.content,
                imageUri: params.imageUri && params.imageUri.trim() !== '' ? params.imageUri : undefined,
                audioUri: params.audioUri && params.audioUri.trim() !== '' ? params.audioUri : undefined,
                createdAt: params.createdAt || 'Unknown date'
            }
        }
        return null
    }, [params.entryId, params.title, params.content, params.imageUri, params.audioUri, params.createdAt])

    useEffect(() => {
        if (entryData) {
           
            setEntry(entryData)
            setTitle(entryData.title)
            setContent(entryData.content)
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
        }
        setIsEditing(false)
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
            }

            await updateJournalEntry(params.entryId, updates, token)
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
                    <Ionicons name="arrow-back" size={24} color={currentTheme.foreground} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEditing ? 'Edit Entry' : 'Journal Entry'}
                </Text>
                <TouchableOpacity
                    onPress={handleDelete}
                    disabled={isDeleting || isEditing}
                    style={[styles.deleteButton, (isDeleting || isEditing) && styles.deleteButtonDisabled]}
                >
                    <Ionicons
                        name="trash-outline"
                        size={20}
                        color={(isDeleting || isEditing) ? currentTheme.mutedForeground : currentTheme.destructive}
                    />
                </TouchableOpacity>
            </View>

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
                        <TouchableOpacity 
                            onPress={() => {
                                fetch(entry.imageUri!, { 
                                    method: 'GET',
                                    headers: {
                                        'Accept': 'image/*',
                                        'User-Agent': 'ReactNative'
                                    }
                                })
                                    .then(response => {
                                        
                                        if (response.headers.get('content-type')?.includes('json')) {
                                            return response.text().then(text => {
                                                throw new Error(`Firebase returned error: ${text}`)
                                            })
                                        }
                                        return response.blob()
                                    })
                                    .then(blob => {
                                    })
                                    .catch(error => {
                                        console.error('❌ Firebase Storage error:', error)
                                    })
                            }}
                            style={{ marginBottom: 8 }}
                        >
                            <Text style={{ color: currentTheme.primary, fontSize: 12 }}>
                                Debug Firebase URL (tap to see error)
                            </Text>
                        </TouchableOpacity>
                        <View style={styles.imageContainer}>
                            {imageLoading && !imageError && (
                                <View style={styles.imageLoadingContainer}>
                                    <Text style={styles.imageLoadingText}>Loading image...</Text>
                                </View>
                            )}
                            {imageError ? (
                                <View style={styles.imageErrorContainer}>
                                    <Ionicons name="image-outline" size={48} color={currentTheme.mutedForeground} />
                                    <Text style={styles.imageErrorText}>Image unavailable</Text>
                                </View>
                            ) : (
                                <Image 
                                    source={{ 
                                        uri: entry.imageUri,
                                        headers: {
                                            'Accept': 'image/*',
                                            'User-Agent': 'ReactNative'
                                        }
                                    }} 
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
                                <Ionicons
                                    name={isPlaying ? "stop" : "play"}
                                    size={24}
                                    color={currentTheme.primaryForeground}
                                />
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

                        {/* Edit Button */}
                        <TouchableOpacity
                            onPress={handleEdit}
                            style={styles.editButton}
                        >
                            <Ionicons name="create-outline" size={20} color={currentTheme.primaryForeground} />
                            <Text style={styles.editButtonText}>Edit Entry</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
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
})