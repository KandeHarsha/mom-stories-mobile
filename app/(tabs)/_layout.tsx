import { Tabs } from 'expo-router';
import { BookOpen, Heart, Home, MessageCircle, User } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import themes from '../../constants/colors';

const _layout = () => {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme as keyof typeof themes] ?? themes.light;

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: currentTheme.background,
          borderTopColor: currentTheme.border,
        },
        tabBarActiveTintColor: currentTheme.primary,
        tabBarInactiveTintColor: currentTheme.mutedForeground,
      }}
    >
      <Tabs.Screen name='index' options={{
        title: 'Dashboard',
        headerShown: false,
        tabBarIcon: ({ focused, size }) => (
          <Home size={size} color={focused ? currentTheme.primary : currentTheme.mutedForeground} fill={focused ? currentTheme.primary : 'none'} />
        ),
      }} />
      <Tabs.Screen name='privateJournal' options={{
        title: 'Private Journal',
        headerShown: false,
        tabBarIcon: ({ focused, size }) => (
          <BookOpen size={size} color={focused ? currentTheme.primary : currentTheme.mutedForeground} fill={focused ? currentTheme.primary : 'none'} />
        ),
      }} />
      <Tabs.Screen name='healthTracker' options={{
        title: 'Health Tracker',
        headerShown: false,
        tabBarIcon: ({ focused, size }) => (
          <Heart size={size} color={focused ? currentTheme.primary : currentTheme.mutedForeground} fill={focused ? currentTheme.primary : 'none'} />
        ),
      }} />
      <Tabs.Screen name='aiSupport' options={{
        title: 'AI Support',
        headerShown: false,
        tabBarIcon: ({ focused, size }) => (
          <MessageCircle size={size} color={focused ? currentTheme.primary : currentTheme.mutedForeground} fill={focused ? currentTheme.primary : 'none'} />
        ),
      }} />
      <Tabs.Screen name='profile' options={{
        title: 'Profile',
        headerShown: false,
        tabBarIcon: ({ focused, size }) => (
          <User size={size} color={focused ? currentTheme.primary : currentTheme.mutedForeground} fill={focused ? currentTheme.primary : 'none'} />
        ),
      }} />

    </Tabs>
  )
}

export default _layout