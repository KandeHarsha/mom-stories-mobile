import themes from '@/constants/colors'
import { ArrowLeft, Bookmark, RefreshCw } from 'lucide-react-native'
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
import { useAuth } from '../hooks/useAuth'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL

interface Memory {
  id: string
  title: string
  text: string
  createdAt: string
  isAiResponse: boolean
  userId: string
}

interface SavedResponsesProps {
  onBack: () => void
}

const SavedResponses: React.FC<SavedResponsesProps> = ({ onBack }) => {
  const { token } = useAuth()
  const { colorScheme } = useColorScheme()
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light

  const [savedAnswers, setSavedAnswers] = useState<Memory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedAnswer, setExpandedAnswer] = useState<string | null>(null)

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  })

  const fetchSavedAnswers = async () => {
    if (!token) return

    setIsLoading(true)
    try {
      const url = `${API_BASE_URL}/memories?isAiResponse=true`

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })


      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch saved answers: ${response.status}`)
      }

      const fetchedMemories = await response.json()
      setSavedAnswers(fetchedMemories)
    } catch (error) {
      console.error('Error fetching saved answers:', error)
      Alert.alert('Error', 'Failed to load saved answers')
    } finally {
      setIsLoading(false)
    }
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
          {savedAnswers.map((memory) => (
            <View
              key={memory.id}
              style={{
                backgroundColor: currentTheme.card,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}
            >
              {/* Title and Date */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 12
              }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: currentTheme.foreground,
                  flex: 1,
                  marginRight: 8
                }}>
                  {memory.title}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: currentTheme.mutedForeground
                }}>
                  {memory.createdAt}
                </Text>
              </View>

              {/* Response Text */}
              <Text style={{
                fontSize: 14,
                color: currentTheme.foreground,
                lineHeight: 20,
                marginBottom: 12
              }} numberOfLines={expandedAnswer === memory.id ? undefined : 3}>
                {memory.text}
              </Text>

              {/* Expand/Collapse Button */}
              {memory.text.length > 150 && (
                <TouchableOpacity
                  onPress={() => toggleExpanded(memory.id)}
                  style={{
                    alignSelf: 'flex-start'
                  }}
                >
                  <Text style={{
                    color: currentTheme.primary,
                    fontSize: 14,
                    fontWeight: '500'
                  }}>
                    {expandedAnswer === memory.id ? 'Show Less' : 'Show More'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

export default SavedResponses