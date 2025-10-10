import themes from '@/constants/colors'
import { useRouter } from 'expo-router'
import { ChevronRight, HelpCircle, LogIn, LogOut, Settings, Shield, User } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import React, { useState } from 'react'
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../hooks/useAuth'

const ProfileScreen = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const { colorScheme } = useColorScheme()
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true)
            try {
              await logout()
              // Force redirect to login after logout
              setTimeout(() => {
                router.replace('/(auth)/login')
              }, 200)
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.')
            } finally {
              setIsLoggingOut(false)
            }
          }
        }
      ]
    )
  }

  const handleLogin = () => {
    router.replace('/(auth)/login')
  }

  const menuItems = [
    {
      id: 'account',
      title: 'Account Settings',
      subtitle: 'Manage your account information',
      icon: Settings,
      onPress: () => Alert.alert('Coming Soon', 'Account settings will be available soon')
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      subtitle: 'Control your privacy settings',
      icon: Shield,
      onPress: () => Alert.alert('Coming Soon', 'Privacy settings will be available soon')
    },
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: HelpCircle,
      onPress: () => Alert.alert('Coming Soon', 'Help & support will be available soon')
    }
  ]

  const styles = createStyles(currentTheme)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your account and preferences</Text>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            {(user?.ThumbnailImageUrl || user?.ImageUrl) ? (
              <Image 
                source={{ uri: user.ThumbnailImageUrl || user.ImageUrl || '' }} 
                style={styles.avatarImage}
                onError={() => {
                  // Handle image load error by showing default avatar
                }}
              />
            ) : (
              <User size={32} color={currentTheme.primary} />
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {isAuthenticated 
                ? (user?.FullName || user?.FirstName || 'Welcome User')
                : 'Not Logged In'
              }
            </Text>
            <Text style={styles.userEmail}>
              {isAuthenticated 
                ? (user?.Email?.[0]?.Value || 'No email available')
                : 'Please login to view your profile'
              }
            </Text>
            {isAuthenticated && user?.Company && (
              <Text style={styles.userCompany}>
                {user.Company}
              </Text>
            )}
            {isAuthenticated && (user?.LocalCity || user?.LocalCountry) && (
              <Text style={styles.userLocation}>
                {[user.LocalCity, user.LocalCountry].filter(Boolean).join(', ')}
              </Text>
            )}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemIcon}>
                <item.icon size={20} color={currentTheme.primary} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={16} color={currentTheme.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Login/Logout Button */}
        <View style={styles.logoutSection}>
          {isAuthenticated ? (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={isLoggingOut}
              activeOpacity={0.7}
            >
              <LogOut size={20} color={currentTheme.destructiveForeground} />
              <Text style={styles.logoutButtonText}>
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.7}
            >
              <LogIn size={20} color={currentTheme.primaryForeground} />
              <Text style={styles.loginButtonText}>
                Login
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Mom Stories Mobile</Text>
          <Text style={styles.appInfoText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default ProfileScreen

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
  userCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.foreground,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.cardForeground,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: theme.mutedForeground,
    marginBottom: 2,
  },
  userCompany: {
    fontSize: 13,
    color: theme.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 12,
    color: theme.mutedForeground,
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.foreground,
    marginBottom: 12,
  },
  menuItem: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.foreground,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.cardForeground,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: theme.mutedForeground,
  },
  logoutSection: {
    marginBottom: 24,
  },
  logoutButton: {
    backgroundColor: theme.destructive,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: theme.destructiveForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: theme.primaryForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  appInfoText: {
    fontSize: 12,
    color: theme.mutedForeground,
    marginBottom: 2,
  },
})