import themes from '@/constants/colors'
import { useAuth } from '@/context/AuthContext'
import { useSwipeDrawer } from '@/hooks'
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { Bookmark, ChevronRight, Menu, MessageCircle, Mic, MicOff, Plus, Send, X } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import SavedResponses from './SavedResponses'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL

interface Timestamp {
  seconds: number
  nanoseconds: number
}

interface Session {
  id: string
  title: string
  userId: string
  updatedAt: Timestamp
  createdAt: Timestamp
}

interface ApiMessage {
  id: string
  createdAt: Timestamp
  sessionId: string
  metadata: any
  content: string
  role: 'user' | 'model'
  userId: string
  isSaved: boolean
}

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  questionForAi?: string
  isSaved?: boolean
  isSaving?: boolean
}

interface AiSupportScreenProps {
  initialQuestion?: string
}

const AiSupportScreen = ({ initialQuestion }: AiSupportScreenProps = {}) => {
  const { session } = useAuth();
  const token = session?.accessToken;
  const { colorScheme } = useColorScheme()
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light

  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    text: "Hello! I'm your AI companion for emotional and practical support. I'm here to listen without judgment. What's on your mind? Please remember, I'm not a medical professional.",
    sender: 'ai',
  }])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView] = useState<'chat' | 'saved'>('chat')
  const [hasProcessedQuestion, setHasProcessedQuestion] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [currentSessionTitle, setCurrentSessionTitle] = useState<string>('New Chat')
  const [isListening, setIsListening] = useState(false)

  const scrollViewRef = useRef<ScrollView>(null)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null)
  const acceptSpeechResults = useRef(false)
  const speechBaseText = useRef('')
  
  // Swipe drawer hook for gesture support
  const {
    isOpen: isDrawerOpen,
    drawerAnim,
    panHandlers,
    openDrawer,
    closeDrawer,
    drawerWidthPx: DRAWER_WIDTH,
  } = useSwipeDrawer({
    drawerWidth: 0.8,
    edgeThreshold: 20,
    swipeThreshold: 50,
  })

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  })

  // ─── Speech Recognition ─────────────────────────────────────────────────────

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    )
    pulseLoop.current.start()
  }

  const stopPulse = () => {
    pulseLoop.current?.stop()
    pulseAnim.setValue(1)
  }

  useSpeechRecognitionEvent('result', (event) => {
    if (!acceptSpeechResults.current) return
    const transcript = event.results[0]?.transcript ?? ''
    if (!transcript) return
    const base = speechBaseText.current
    setInput(base.trim().length === 0 ? transcript : base.trimEnd() + ' ' + transcript)
  })

  useSpeechRecognitionEvent('error', (event) => {
    console.warn('Speech recognition error:', event.error, event.message)
    if (event.error !== 'aborted') {
      Alert.alert('Speech Error', event.message || 'Speech recognition failed. Please try again.')
    }
    setIsListening(false)
    stopPulse()
  })

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false)
    stopPulse()
  })

  const toggleSpeechRecognition = async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop()
      return
    }

    const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync()

    if (status !== 'granted') {
      Alert.alert(
        'Microphone Permission Required',
        'Please allow microphone access so you can use voice input.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      )
      return
    }

    speechBaseText.current = input
    setIsListening(true)
    acceptSpeechResults.current = true
    startPulse()
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false })
  }

  // ────────────────────────────────────────────────────────────────────────────

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

  const convertApiMessageToMessage = (apiMsg: ApiMessage): Message => ({
    id: apiMsg.id,
    text: apiMsg.content,
    sender: apiMsg.role === 'model' ? 'ai' : 'user',
    isSaved: apiMsg.isSaved,
    isSaving: false,
    questionForAi: apiMsg.role === 'model' ? undefined : apiMsg.content,
  })

  const fetchSessions = async () => {
    if (!token) return

    setIsLoadingSessions(true)
    try {
      const response = await fetch(`${API_BASE_URL}/ai-support/sessions/`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`)
      }

      const data = await response.json()
      setSessions(data)
    } catch (error) {
      console.error('Error fetching sessions:', error)
      Alert.alert('Error', 'Failed to load your conversations')
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const fetchSessionMessages = async (sessionId: string) => {
    if (!token) return

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/ai-support/sessions/${sessionId}/messages`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`)
      }

      const data: ApiMessage[] = await response.json()
      const convertedMessages = data.map(convertApiMessageToMessage)
      setMessages(convertedMessages)
    } catch (error) {
      console.error('Error fetching session messages:', error)
      Alert.alert('Error', 'Failed to load conversation messages')
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !token) return

    // Stop any active speech recognition before sending
    if (isListening) {
      acceptSpeechResults.current = false
      ExpoSpeechRecognitionModule.stop()
      setIsListening(false)
      stopPulse()
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user'
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const url = `${API_BASE_URL}/ai-support`
      const headers = getAuthHeaders()
      const body = JSON.stringify({
        question: userMessage.text,
        ...(currentSessionId && { sessionId: currentSessionId })
      })

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      // Store sessionId for new sessions
      if (data.sessionId && !currentSessionId) {
        setCurrentSessionId(data.sessionId)
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || data.message || data.answer || 'Sorry, I couldn\'t process your request.',
        sender: 'ai',
        questionForAi: userMessage.text
      }

      setMessages(prev => [...prev, aiMessage])
      
      // Refresh sessions list to show updated title/timestamp
      fetchSessions()
      
      // Refetch session messages to sync with actual message IDs from backend
      if (data.sessionId) {
        await fetchSessionMessages(data.sessionId)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const saveResponse = async (message: Message) => {
    if (!token) return

    // Update message to show saving state
    setMessages(prev => prev.map(msg =>
      msg.id === message.id ? { ...msg, isSaving: true } : msg
    ))

    try {
      const response = await fetch(`${API_BASE_URL}/ai-support/message/${message.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isSaved: true })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save response: ${response.status}`)
      }

      // Update message to show saved state
      setMessages(prev => prev.map(msg =>
        msg.id === message.id ? { ...msg, isSaved: true, isSaving: false } : msg
      ))

      Alert.alert('Success', 'Response saved successfully!')
    } catch (error) {
      console.error('Error saving response:', error)
      Alert.alert('Error', `Failed to save response: ${error instanceof Error ? error.message : 'Unknown error'}`)

      // Reset saving state on error
      setMessages(prev => prev.map(msg =>
        msg.id === message.id ? { ...msg, isSaving: false } : msg
      ))
    }
  }

  const showSavedResponses = () => {
    setView('saved')
  }

  const startNewChat = () => {
    setCurrentSessionId(null)
    setCurrentSessionTitle('New Chat')
    setMessages([{
      id: 'welcome',
      text: "Hello! I'm your AI companion for emotional and practical support. I'm here to listen without judgment. What's on your mind? Please remember, I'm not a medical professional.",
      sender: 'ai',
    }])
    closeDrawer()
  }

  const openSession = async (session: Session) => {
    setCurrentSessionId(session.id)
    setCurrentSessionTitle(session.title)
    closeDrawer()
    await fetchSessionMessages(session.id)
  }

  // Fetch sessions on mount
  useEffect(() => {
    if (token) {
      fetchSessions()
    }
  }, [token])

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true })
  }, [messages])

  // Handle incoming question from dashboard
  useEffect(() => {
    if (initialQuestion && !hasProcessedQuestion && token) {
      setHasProcessedQuestion(true)
      
      // Start a new chat session
      startNewChat()
      
      // Automatically send the question
      const sendInitialQuestion = async () => {
        const userMessage: Message = {
          id: Date.now().toString(),
          text: initialQuestion,
          sender: 'user'
        }

        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)

        try {
          const url = `${API_BASE_URL}/ai-support`
          const headers = getAuthHeaders()
          const body = JSON.stringify({
            question: userMessage.text
          })

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`API Error: ${response.status} - ${errorText}`)
          }

          const data = await response.json()

          // Store sessionId for new session
          if (data.sessionId) {
            setCurrentSessionId(data.sessionId)
          }

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: data.response || data.message || data.answer || 'Sorry, I couldn\'t process your request.',
            sender: 'ai',
            questionForAi: userMessage.text
          }

          setMessages(prev => [...prev, aiMessage])
          
          // Refetch session messages to sync with actual message IDs from backend
          if (data.sessionId) {
            await fetchSessionMessages(data.sessionId)
          }
        } catch (error) {
          console.error('Error sending message:', error)
          Alert.alert('Error', `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
          setIsLoading(false)
        }
      }

      sendInitialQuestion()
    }
  }, [initialQuestion, hasProcessedQuestion, token])

  if (view === 'saved') {
    return <SavedResponses onBack={() => setView('chat')} />
  }

  // Get latest 2 sessions for quick access chips (excluding current session)
  const quickAccessSessions = sessions
    .filter(s => s.id !== currentSessionId)
    .slice(0, 2)

  // Side Drawer Component
  const renderDrawer = () => {
    if (!isDrawerOpen) return null

    return (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }} />
        </TouchableWithoutFeedback>

        {/* Drawer */}
        <Animated.View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: DRAWER_WIDTH,
          backgroundColor: currentTheme.background,
          transform: [{ translateX: drawerAnim }],
          shadowColor: '#000',
          shadowOffset: { width: 2, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 10,
        }}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Drawer Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: currentTheme.border,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: currentTheme.foreground,
              }}>
                Conversations
              </Text>
              <TouchableOpacity onPress={closeDrawer} style={{ padding: 4 }}>
                <X size={24} color={currentTheme.foreground} />
              </TouchableOpacity>
            </View>

            {/* New Chat Button */}
            <TouchableOpacity
              onPress={startNewChat}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                margin: 12,
                backgroundColor: currentTheme.primary,
                borderRadius: 12,
              }}
            >
              <Plus size={20} color={currentTheme.primaryForeground} />
              <Text style={{
                marginLeft: 12,
                fontSize: 16,
                fontWeight: '600',
                color: currentTheme.primaryForeground,
              }}>
                New Chat
              </Text>
            </TouchableOpacity>

            {/* Sessions List */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12 }}>
              {isLoadingSessions && (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={currentTheme.primary} />
                </View>
              )}

              {!isLoadingSessions && sessions.length === 0 && (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <MessageCircle size={40} color={currentTheme.mutedForeground} />
                  <Text style={{
                    marginTop: 12,
                    fontSize: 14,
                    color: currentTheme.mutedForeground,
                    textAlign: 'center',
                  }}>
                    No previous conversations
                  </Text>
                </View>
              )}

              {sessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  onPress={() => openSession(session)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    marginBottom: 8,
                    backgroundColor: currentSessionId === session.id 
                      ? currentTheme.secondary 
                      : currentTheme.card,
                    borderRadius: 10,
                    borderWidth: currentSessionId === session.id ? 1 : 0,
                    borderColor: currentTheme.primary,
                  }}
                >
                  <MessageCircle size={18} color={currentTheme.mutedForeground} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: currentTheme.foreground,
                      }}
                      numberOfLines={1}
                    >
                      {session.title}
                    </Text>
                    <Text style={{
                      fontSize: 11,
                      color: currentTheme.mutedForeground,
                      marginTop: 2,
                    }}>
                      {formatRelativeTime(session.updatedAt)}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={currentTheme.mutedForeground} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Saved Responses Link */}
            <TouchableOpacity
              onPress={() => {
                closeDrawer()
                setTimeout(() => showSavedResponses(), 300)
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: currentTheme.border,
              }}
            >
              <Bookmark size={20} color={currentTheme.primary} />
              <Text style={{
                marginLeft: 12,
                fontSize: 15,
                fontWeight: '500',
                color: currentTheme.foreground,
              }}>
                Saved Responses
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>
      </View>
    )
  }

  // Chat View
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.background }}>
      <View style={{ flex: 1 }} {...panHandlers}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={50}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity
              onPress={openDrawer}
              style={{
                padding: 8,
                marginRight: 8
              }}
            >
              <Menu size={24} color={currentTheme.foreground} />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: currentTheme.foreground,
                flex: 1
              }}
              numberOfLines={1}
            >
              {currentSessionTitle}
            </Text>
          </View>
          <TouchableOpacity
            onPress={showSavedResponses}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: currentTheme.primary
            }}
          >
            <Bookmark size={20} color="white" fill="white" />
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
              {message.sender === 'ai' && message.id !== 'welcome' && (
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
                      <Bookmark
                        size={14}
                        color={message.isSaved ? currentTheme.primary : currentTheme.mutedForeground}
                        fill={message.isSaved ? currentTheme.primary : 'none'}
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

        {/* Quick Access Chips - Above Input (only show for new chats with no messages sent yet) */}
        {quickAccessSessions.length > 0 && !currentSessionId && (
          <View style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 8,
            borderTopWidth: 1,
            borderTopColor: currentTheme.border,
          }}>
            <Text style={{
              fontSize: 11,
              color: currentTheme.mutedForeground,
              marginBottom: 6,
              fontWeight: '500',
            }}>
              Recent chats
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {quickAccessSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  onPress={() => openSession(session)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: currentTheme.card,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: currentTheme.border,
                    maxWidth: 180,
                  }}
                >
                  <MessageCircle size={14} color={currentTheme.primary} />
                  <Text
                    style={{
                      marginLeft: 6,
                      fontSize: 13,
                      color: currentTheme.foreground,
                      fontWeight: '500',
                    }}
                    numberOfLines={1}
                  >
                    {session.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input */}
        <View style={{
          flexDirection: 'row',
          padding: 16,
          alignItems: 'flex-end',
          borderTopWidth: 1,
          borderTopColor: currentTheme.border
        }}>
          {/* Text input + mic icon container */}
          <View style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'flex-end',
            borderWidth: 1,
            borderColor: isListening ? currentTheme.primary : currentTheme.border,
            borderRadius: 20,
            backgroundColor: currentTheme.background,
            marginRight: 8,
            paddingRight: 8,
          }}>
            <TextInput
              style={{
                flex: 1,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: currentTheme.foreground,
                maxHeight: 100,
              }}
              value={input}
              onChangeText={setInput}
              placeholder={isListening ? 'Listening…' : 'Type your message...'}
              placeholderTextColor={isListening ? currentTheme.primary : currentTheme.mutedForeground}
              multiline
              textAlignVertical="top"
            />
            {/* Mic button — trailing icon inside input */}
            <TouchableOpacity
              onPress={toggleSpeechRecognition}
              style={{ paddingBottom: 12, paddingHorizontal: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                {isListening ? (
                  <MicOff size={20} color={currentTheme.primary} />
                ) : (
                  <Mic size={20} color={currentTheme.mutedForeground} />
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
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
            <Send
              size={20}
              color={input.trim() && !isLoading ? currentTheme.primaryForeground : currentTheme.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </View>

      {/* Side Drawer */}
      {renderDrawer()}
    </SafeAreaView>
  )
}

export default AiSupportScreen
