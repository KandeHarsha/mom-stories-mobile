import themes from '@/constants/colors'
import { useAuth } from '@/context/AuthContext'
import { ArrowLeft, Bookmark, RefreshCw, Trash2 } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL

interface Timestamp {
  seconds: number
  nanoseconds: number
}

interface SavedMessage {
  id: string
  createdAt: Timestamp
  sessionId: string
  userId: string
  content: string
  metadata: any
  role: 'user' | 'model'
  isSaved: boolean
}

interface SavedResponsesProps {
  onBack: () => void
}

const SavedResponses: React.FC<SavedResponsesProps> = ({ onBack }) => {
  const { session } = useAuth()
  const token = session?.accessToken
  const { colorScheme } = useColorScheme()
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light

  const [savedAnswers, setSavedAnswers] = useState<SavedMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedAnswer, setExpandedAnswer] = useState<string | null>(null)
  const [unsavingIds, setUnsavingIds] = useState<Set<string>>(new Set())

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  })

  const formatRelativeTime = (timestamp: Timestamp): string => {
    const now = Date.now()
    const messageTime = timestamp.seconds * 1000
    const diffInSeconds = Math.floor((now - messageTime) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return `${Math.floor(diffInSeconds / 604800)}w ago`
  }

  const fetchSavedAnswers = async () => {
    if (!token) return

    setIsLoading(true)
    try {
      const url = `${API_BASE_URL}/ai-support/message/saved`

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch saved answers: ${response.status}`)
      }

      const fetchedMessages: SavedMessage[] = await response.json()
      setSavedAnswers(fetchedMessages)
    } catch (error) {
      console.error('Error fetching saved answers:', error)
      Alert.alert('Error', 'Failed to load saved answers')
    } finally {
      setIsLoading(false)
    }
  }

  const unsaveMessage = async (messageId: string) => {
    if (!token) return

    Alert.alert(
      'Unsave Response',
      'Are you sure you want to remove this saved response?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUnsavingIds(prev => new Set(prev).add(messageId))
            
            try {
              const response = await fetch(`${API_BASE_URL}/ai-support/message/${messageId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ isSaved: false })
              })

              if (!response.ok) {
                throw new Error(`Failed to unsave message: ${response.status}`)
              }

              // Remove from local state
              setSavedAnswers(prev => prev.filter(msg => msg.id !== messageId))
            } catch (error) {
              console.error('Error unsaving message:', error)
              Alert.alert('Error', 'Failed to remove saved response')
            } finally {
              setUnsavingIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(messageId)
                return newSet
              })
            }
          }
        }
      ]
    )
  }

  React.useEffect(() => {
    if (token) {
      fetchSavedAnswers()
    }
  }, [token])

  const toggleExpanded = (id: string) => {
    setExpandedAnswer(expandedAnswer === id ? null : id)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.border
      }}>
        <TouchableOpacity
          onPress={onBack}
          style={{
            padding: 8,
            marginRight: 12
          }}
        >
          <ArrowLeft size={24} color={currentTheme.foreground} />
        </TouchableOpacity>
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: currentTheme.foreground,
          flex: 1
        }}>
          Saved AI Responses
        </Text>
        <TouchableOpacity
          onPress={fetchSavedAnswers}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: currentTheme.primary
          }}
        >
          <RefreshCw size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <ActivityIndicator size="large" color={currentTheme.primary} />
          <Text style={{
            marginTop: 16,
            color: currentTheme.mutedForeground
          }}>
            Loading saved responses...
          </Text>
        </View>
      ) : savedAnswers.length === 0 ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 32
        }}>
          <Bookmark size={64} color={currentTheme.mutedForeground} />
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: currentTheme.foreground,
            marginTop: 16,
            textAlign: 'center'
          }}>
            No Saved Responses
          </Text>
          <Text style={{
            fontSize: 14,
            color: currentTheme.mutedForeground,
            marginTop: 8,
            textAlign: 'center'
          }}>
            Your saved AI responses will appear here
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {savedAnswers.map((message) => {
            const isUnsaving = unsavingIds.has(message.id)
            
            return (
            <View
              key={message.id}
              style={{
                backgroundColor: currentTheme.card,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: currentTheme.border,
                opacity: isUnsaving ? 0.5 : 1
              }}
            >
              {/* Header with Date and Unsave Button */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12
              }}>
                <Text style={{
                  fontSize: 12,
                  color: currentTheme.mutedForeground
                }}>
                  {formatRelativeTime(message.createdAt)}
                </Text>
                <TouchableOpacity
                  onPress={() => unsaveMessage(message.id)}
                  disabled={isUnsaving}
                  style={{
                    padding: 6,
                    borderRadius: 8,
                    backgroundColor: currentTheme.destructive || '#ef4444'
                  }}
                >
                  {isUnsaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Trash2 size={16} color="white" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Response Text */}
              <Text style={{
                fontSize: 14,
                color: currentTheme.foreground,
                lineHeight: 20,
                marginBottom: 12
              }} numberOfLines={expandedAnswer === message.id ? undefined : 3}>
                {message.content}
              </Text>

              {/* Expand/Collapse Button */}
              {message.content.length > 150 && (
                <TouchableOpacity
                  onPress={() => toggleExpanded(message.id)}
                  style={{
                    alignSelf: 'flex-start'
                  }}
                >
                  <Text style={{
                    color: currentTheme.primary,
                    fontSize: 14,
                    fontWeight: '500'
                  }}>
                    {expandedAnswer === message.id ? 'Show Less' : 'Show More'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )})}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

export default SavedResponses