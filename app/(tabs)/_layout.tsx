import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React from 'react';
import themes from '../../constants/colors';

const _layout = () => {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme] ?? themes.light;

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
          <Ionicons name="grid-outline" color={focused ? currentTheme.primary : currentTheme.mutedForeground} size={size} />
        ),
      }} />
      <Tabs.Screen name='privateJournal' options={{
        title: 'Private Journal',
        headerShown: false,
        tabBarIcon: ({ focused, size }) => (
          <Ionicons name="book-outline" color={focused ? currentTheme.primary : currentTheme.mutedForeground} size={size} />
        ),
      }} />
      <Tabs.Screen name='healthTracker' options={{
        title: 'Health Tracker',
        headerShown: false,
        tabBarIcon: ({ focused, size }) => (
          <Ionicons name="heart-outline" color={focused ? currentTheme.primary : currentTheme.mutedForeground} size={size} />
        ),
      }} />
      <Tabs.Screen name='aiSupport' options={{
        title: 'Gentle AI Support',
        headerShown: false,
        tabBarIcon: ({ focused, size }) => (
          <Ionicons name="chatbubble-outline" color={focused ? currentTheme.primary : currentTheme.mutedForeground} size={size} />
        ),
      }} />

    </Tabs>
  )
}

export default _layout