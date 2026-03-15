import themes from '@/constants/colors'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'expo-router'
import { Baby, ChevronRight, HelpCircle, LogIn, LogOut, Settings, Shield, User } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const ProfileScreen = () => {
  const { user, logout, session, selectedChildId, setSelectedChildId, refreshUser } = useAuth()
  const { colorScheme } = useColorScheme()
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [children, setChildren] = useState<any[]>([])
  const [loadingChildren, setLoadingChildren] = useState(false)
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

  // Fetch children data
  useEffect(() => {
    const fetchChildren = async () => {
      if (!session?.accessToken || !user?.childrenIds || user.childrenIds.length === 0) {
        return;
      }

      setLoadingChildren(true);
      try {
        const childrenData = await Promise.all(
          user.childrenIds.map(async (childId: string) => {
            const response = await fetch(`${API_BASE_URL}/children/${childId}`, {
              headers: {
                'Authorization': `Bearer ${session.accessToken}`,
              },
            });
            if (response.ok) {
              const data = await response.json();
              return data.profile || data;
            }
            return null;
          })
        );
        setChildren(childrenData.filter(Boolean));
      } catch (error) {
        console.error('Failed to fetch children:', error);
      } finally {
        setLoadingChildren(false);
      }
    };

    fetchChildren();
  }, [session, user]);

  const handleVerifyEmail = async () => {
    if (!session?.accessToken || !user?.email) {
      Alert.alert('Error', 'Unable to verify email. Please try again.');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/email-otp/send-verification-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': `${API_BASE_URL}`,
            'Authorization': `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            email: user.email,
            type: 'email-verification',
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        router.push('/(auth)/verifyEmail');
      } else {
        Alert.alert(
          'Error',
          data.message || 'Failed to send verification OTP. Please try again.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'An error occurred while sending verification OTP. Please try again.'
      );
      console.error('Send verification OTP error:', error);
    }
  };

  const menuItems = [
    ...(session && user?.emailVerified === false ? [{
      id: 'verify-email',
      title: 'Verify Email',
      subtitle: 'Verify your email address to secure your account',
      icon: Shield,
      onPress: handleVerifyEmail
    }] : []),
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
      onPress: () => router.push('/profile/customerSupport')
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
            <User size={32} color={currentTheme.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {session 
                ? (user?.name || 'Welcome User')
                : 'Not Logged In'
              }
            </Text>
            <Text style={styles.userEmail}>
              {session 
                ? (user?.email || 'No email available')
                : 'Please login to view your profile'
              }
            </Text>
            {session && user?.phase && (
              <View style={styles.phaseContainer}>
                <Text style={styles.phaseLabel}>Phase:</Text>
                <Text style={styles.phaseValue}>
                  {user.phase === 'preparation' ? 'Preparing for Motherhood' :
                   user.phase === 'pregnancy' ? 'Pregnancy Journey' :
                   user.phase === 'post_delivery' ? 'Post Delivery Care' :
                   user.phase}
                </Text>
              </View>
            )}
            {session && user?.emailVerified !== undefined && (
              <View style={styles.verificationContainer}>
                <Text style={[
                  styles.verificationText,
                  { color: user.emailVerified ? currentTheme.primary : currentTheme.destructive }
                ]}>
                  {user.emailVerified ? '✓ Email Verified' : '⚠ Email Not Verified'}
                </Text>
              </View>
            )}
            {session && user?.createdAt && (
              <Text style={styles.memberSince}>
                Member since {new Date(user.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </Text>
            )}
          </View>
        </View>

        {/* Children Section */}
        {session && user?.childrenIds && user.childrenIds.length > 0 && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>My Children</Text>
            {loadingChildren ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={currentTheme.primary} />
              </View>
            ) : (
              children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={[
                    styles.childItem,
                    selectedChildId === child.id && styles.childItemSelected
                  ]}
                  onPress={() => {
                    setSelectedChildId(child.id);
                    Alert.alert('Child Selected', `Now viewing ${child.name}'s data`);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.childItemIcon,
                    selectedChildId === child.id && styles.childItemIconSelected
                  ]}>
                    <Baby size={20} color={selectedChildId === child.id ? currentTheme.primary : currentTheme.primary} />
                  </View>
                  <View style={styles.childItemContent}>
                    <Text style={[
                      styles.childItemTitle,
                      selectedChildId === child.id && styles.childItemTitleSelected
                    ]}>
                      {child.name}
                    </Text>
                    <Text style={[
                      styles.childItemSubtitle,
                      selectedChildId === child.id && styles.childItemSubtitleSelected
                    ]}>
                      {child.gender} • Born {new Date(child.birthday).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  {selectedChildId === child.id && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>Active</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

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
          {session ? (
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
    marginBottom: 8,
  },
  phaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  phaseLabel: {
    fontSize: 13,
    color: theme.mutedForeground,
    marginRight: 6,
  },
  phaseValue: {
    fontSize: 13,
    color: theme.primary,
    fontWeight: '500',
  },
  verificationContainer: {
    marginBottom: 4,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  memberSince: {
    fontSize: 12,
    color: theme.mutedForeground,
    fontStyle: 'italic',
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  childItem: {
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  childItemSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  childItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  childItemIconSelected: {
    backgroundColor: theme.primaryForeground,
  },
  childItemContent: {
    flex: 1,
  },
  childItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.cardForeground,
    marginBottom: 2,
  },
  childItemTitleSelected: {
    color: theme.primaryForeground,
  },
  childItemSubtitle: {
    fontSize: 14,
    color: theme.mutedForeground,
  },
  childItemSubtitleSelected: {
    color: theme.primaryForeground,
    opacity: 0.9,
  },
  selectedBadge: {
    backgroundColor: theme.primaryForeground,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
  },
})