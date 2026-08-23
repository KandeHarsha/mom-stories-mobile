import themes from '@/constants/colors'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'expo-router'
import { ArrowLeft, Edit2, Mail, Save, User, X } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL

const AccountSettings = () => {
  const { user, session, refreshUser } = useAuth()
  const { colorScheme } = useColorScheme()
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light
  const router = useRouter()
  
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form state
  const [editedName, setEditedName] = useState(user?.name || '')
  const [editedPhase, setEditedPhase] = useState(user?.phase || 'preparation')

  const phases = [
    { value: 'preparation', label: 'Preparing for Motherhood' },
    { value: 'pregnancy', label: 'Pregnancy Journey' },
    { value: 'post_delivery', label: 'Post Delivery Care' }
  ]

  const handleEdit = () => {
    setEditedName(user?.name || '')
    setEditedPhase(user?.phase || 'preparation')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setEditedName(user?.name || '')
    setEditedPhase(user?.phase || 'preparation')
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Name cannot be empty')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/user`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          data: {
          name: editedName.trim(),
          phase: editedPhase,
          }
        }),
      })

      if (response.ok) {
        await refreshUser()
        setIsEditing(false)
        Alert.alert('Success', 'Your account information has been updated')
      } else {
        const errorData = await response.json().catch(() => ({}))
        Alert.alert('Error', errorData.message || 'Failed to update account information')
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating your information')
      console.error('Update account error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getPhaseLabel = (phaseValue: string) => {
    const phase = phases.find((p) => p.value === phaseValue)
    return phase ? phase.label : phaseValue
  }

  const styles = createStyles(currentTheme)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={currentTheme.foreground} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Account Settings</Text>
            <Text style={styles.subtitle}>Manage your personal information</Text>
          </View>
          {!isEditing && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
              activeOpacity={0.7}
            >
              <Edit2 size={20} color={currentTheme.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* User Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <User size={40} color={currentTheme.primary} />
            </View>
            {user?.emailVerified !== undefined && (
              <View style={styles.verificationBadge}>
                <Text
                  style={[
                    styles.verificationText,
                    {
                      color: user.emailVerified
                        ? currentTheme.primary
                        : currentTheme.destructive,
                    },
                  ]}
                >
                  {user.emailVerified ? '✓ Verified' : '⚠ Not Verified'}
                </Text>
              </View>
            )}
          </View>

          {/* Name Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your name"
                placeholderTextColor={currentTheme.mutedForeground}
                editable={!isSaving}
              />
            ) : (
              <View style={styles.fieldValue}>
                <User size={18} color={currentTheme.mutedForeground} />
                <Text style={styles.fieldText}>{user?.name || 'Not set'}</Text>
              </View>
            )}
          </View>

          {/* Email Field (Read-only) */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={[styles.fieldValue, styles.readOnlyField]}>
              <Mail size={18} color={currentTheme.mutedForeground} />
              <Text style={styles.fieldText}>{user?.email || 'Not available'}</Text>
            </View>
            <Text style={styles.fieldHint}>Email cannot be changed</Text>
          </View>

          {/* Phase Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Current Phase</Text>
            {isEditing ? (
              <View style={styles.phaseSelector}>
                {phases.map((phase) => (
                  <TouchableOpacity
                    key={phase.value}
                    style={[
                      styles.phaseOption,
                      editedPhase === phase.value && styles.phaseOptionSelected,
                    ]}
                    onPress={() => setEditedPhase(phase.value)}
                    disabled={isSaving}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.phaseRadio,
                        editedPhase === phase.value && styles.phaseRadioSelected,
                      ]}
                    >
                      {editedPhase === phase.value && (
                        <View style={styles.phaseRadioInner} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.phaseOptionText,
                        editedPhase === phase.value && styles.phaseOptionTextSelected,
                      ]}
                    >
                      {phase.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.fieldValue}>
                <View style={styles.phaseBadge}>
                  <Text style={styles.phaseBadgeText}>
                    {getPhaseLabel(user?.phase || 'preparation')}
                  </Text>
                </View>
              </View>
            )}
            <Text style={styles.fieldHint}>
              Your phase determines the content and features available to you
            </Text>
          </View>

          {/* Member Since */}
          {user?.createdAt && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Member Since</Text>
              <View style={styles.fieldValue}>
                <Text style={styles.fieldText}>
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <X size={20} color={currentTheme.mutedForeground} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={currentTheme.primaryForeground} />
              ) : (
                <>
                  <Save size={20} color={currentTheme.primaryForeground} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Your Information</Text>
          <Text style={styles.infoText}>
            • Your name is displayed across the app and in your profile
          </Text>
          <Text style={styles.infoText}>
            • Your phase determines which features and content are most relevant to you
          </Text>
          <Text style={styles.infoText}>
            • Email address is used for authentication and cannot be changed for security reasons
          </Text>
          <Text style={styles.infoText}>
            • All changes are saved securely and synced across your devices
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default AccountSettings

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginBottom: 24,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    headerContent: {
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.foreground,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 14,
      color: theme.mutedForeground,
    },
    editButton: {
      padding: 8,
    },
    detailsCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 24,
      marginBottom: 20,
      shadowColor: theme.foreground,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    avatarContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    verificationBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.muted,
    },
    verificationText: {
      fontSize: 12,
      fontWeight: '600',
    },
    fieldContainer: {
      marginBottom: 24,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.mutedForeground,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    fieldValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.muted,
      borderRadius: 12,
    },
    readOnlyField: {
      opacity: 0.7,
    },
    fieldText: {
      fontSize: 16,
      color: theme.foreground,
      flex: 1,
    },
    fieldHint: {
      fontSize: 12,
      color: theme.mutedForeground,
      marginTop: 6,
      fontStyle: 'italic',
    },
    textInput: {
      fontSize: 16,
      color: theme.foreground,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.muted,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    phaseSelector: {
      gap: 12,
    },
    phaseOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.muted,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    phaseOptionSelected: {
      backgroundColor: theme.primary + '20',
      borderColor: theme.primary,
    },
    phaseRadio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.mutedForeground,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    phaseRadioSelected: {
      borderColor: theme.primary,
    },
    phaseRadioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.primary,
    },
    phaseOptionText: {
      fontSize: 16,
      color: theme.foreground,
      flex: 1,
    },
    phaseOptionTextSelected: {
      fontWeight: '600',
      color: theme.primary,
    },
    phaseBadge: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.primary + '20',
      borderRadius: 20,
    },
    phaseBadgeText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.primary,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
    },
    cancelButton: {
      backgroundColor: theme.muted,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.mutedForeground,
    },
    saveButton: {
      backgroundColor: theme.primary,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primaryForeground,
    },
    infoSection: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 32,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 12,
    },
    infoText: {
      fontSize: 14,
      color: theme.mutedForeground,
      lineHeight: 22,
      marginBottom: 8,
    },
  })
