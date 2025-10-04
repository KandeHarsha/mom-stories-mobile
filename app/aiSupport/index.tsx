import themes from '@/constants/colors'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from 'nativewind'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../hooks/useAuth'
import SavedResponses from './SavedResponses'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL

interface Message {
  id: number
  text: string
  sender: 'user' | 'ai'
  questionForAi?: string
  isSaved?: boolean
  isSaving?: boolean
}

interface Memory {
  id: string
  title: string
  text: string
  createdAt: string
  isAiResponse: boolean
}

const AiSupportScreen = () => {
  const { token } = useAuth()
  const { colorScheme } = useColorScheme()
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light

  const [messages, setMessages] = useState<Message[]>([{
    id: 1,
    text: "Hello! I'm your AI companion for emotional and practical support. I'm here to listen without judgment. What's on your mind? Please remember, I'm not a medical professional.",
    sender: 'ai',
  }])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView] = useState<'chat' | 'saved'>('chat')

  const scrollViewRef = useRef<ScrollView>(null)

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  })

  const sendMessage = async () => {
    if (!input.trim() || !token) return

    const userMessage: Message = {
      id: Date.now(),
      text: input.trim(),
      sender: 'user'
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // API_BASE_URL already includes /api, so just add /ai-support
      const url = `${API_BASE_URL}/ai-support`
      const headers = getAuthHeaders()
      const body = JSON.stringify({
        question: userMessage.text
      })

      console.log('API Request Details:', {
        url,
        headers,
        body,
        API_BASE_URL
      })

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body
      })

      console.log('API Response Status:', response.status)
      console.log('API Response OK:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.log('API Error Response:', errorText)
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('API Success Response:', data)

      const aiMessage: Message = {
        id: Date.now() + 1,
        text: data.response || data.message || data.answer || 'Sorry, I couldn\'t process your request.',
        sender: 'ai',
        questionForAi: userMessage.text
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', `Failed to send message: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const saveResponse = async (message: Message) => {
    if (!token || !message.questionForAi) return

    // Update message to show saving state
    setMessages(prev => prev.map(msg => 
      msg.id === message.id ? { ...msg, isSaving: true } : msg
    ))

    try {
      const formData = new FormData()
      formData.append('title', `AI: ${message.questionForAi}`)
      formData.append('text', message.text)
      formData.append('isAiResponse', 'true')

      const response = await fetch(`${API_BASE_URL}/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      })

      console.log('Save response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.log('Save error:', errorText)
        throw new Error(`Failed to save response: ${response.status}`)
      }

      // Update message to show saved state
      setMessages(prev => prev.map(msg => 
        msg.id === message.id ? { ...msg, isSaved: true, isSaving: false } : msg
      ))

      Alert.alert('Success', 'Response saved successfully!')
    } catch (error) {
      console.error('Error saving response:', error)
      Alert.alert('Error', `Failed to save response: ${(error as Error).message}`)
      
      // Reset saving state on error
      setMessages(prev => prev.map(msg => 
        msg.id === message.id ? { ...msg, isSaving: false } : msg
      ))
    }
  }

  const showSavedResponses = () => {
    setView('saved')
  }

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true })
  }, [messages])

  if (view === 'saved') {
    return <SavedResponses onBack={() => setView('chat')} />
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: currentTheme.border
        }}>
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: currentTheme.foreground
          }}>
            AI Support
          </Text>
          <TouchableOpacity
            onPress={showSavedResponses}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: currentTheme.primary
            }}
          >
            <Ionicons name="bookmark" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={{
                alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                marginBottom: 8
              }}
            >
              <View
                style={{
                  backgroundColor: message.sender === 'user'
                    ? currentTheme.primary
                    : currentTheme.card,
                  padding: 12,
                  borderRadius: 16,
                }}
              >
                <Text style={{
                  color: message.sender === 'user' ? currentTheme.primaryForeground : currentTheme.foreground,
                  fontSize: 16,
                  lineHeight: 22
                }}>
                  {message.text}
                </Text>
              </View>
              
              {/* Save button for AI messages */}
              {message.sender === 'ai' && message.id !== 1 && (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  marginTop: 4
                }}>
                  <TouchableOpacity
                    onPress={() => saveResponse(message)}
                    disabled={message.isSaving || message.isSaved}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 6,
                      borderRadius: 12,
                      backgroundColor: message.isSaved 
                        ? currentTheme.muted 
                        : currentTheme.secondary,
                      opacity: message.isSaving ? 0.6 : 1
                    }}
                  >
                    {message.isSaving ? (
                      <ActivityIndicator size="small" color={currentTheme.primary} />
                    ) : (
                      <Ionicons 
                        name={message.isSaved ? "bookmark" : "bookmark-outline"} 
                        size={14} 
                        color={message.isSaved ? currentTheme.primary : currentTheme.mutedForeground} 
                      />
                    )}
                    <Text style={{
                      marginLeft: 4,
                      fontSize: 12,
                      color: message.isSaved ? currentTheme.primary : currentTheme.mutedForeground,
                      fontWeight: '500'
                    }}>
                      {message.isSaving ? 'Saving...' : message.isSaved ? 'Saved' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {isLoading && (
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: currentTheme.background,
              padding: 12,
              borderRadius: 16,
              marginBottom: 8
            }}>
              <ActivityIndicator size="small" color={currentTheme.primary} />
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={{
          flexDirection: 'row',
          padding: 16,
          alignItems: 'flex-end',
          borderTopWidth: 1,
          borderTopColor: currentTheme.border
        }}>
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: currentTheme.border,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginRight: 8,
              backgroundColor: currentTheme.background,
              color: currentTheme.foreground,
              maxHeight: 100
            }}
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            placeholderTextColor={currentTheme.mutedForeground}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || isLoading}
            style={{
              backgroundColor: input.trim() && !isLoading
                ? currentTheme.primary
                : currentTheme.border,
              borderRadius: 20,
              padding: 12,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Ionicons
              name="send"
              size={20}
              color={input.trim() && !isLoading ? currentTheme.primaryForeground : currentTheme.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default AiSupportScreen
