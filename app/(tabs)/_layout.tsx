import { Tabs } from 'expo-router'
import React from 'react'
import { useColorScheme } from 'nativewind';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const _layout = () => {
  const { colorScheme } = useColorScheme();
  const tabBarBackgroundColor = colorScheme === 'dark' ? 'hsl(30 10% 10%)' : 'hsl(30 50% 95%)';
  const tabBarActiveTintColor = colorScheme === 'dark' ? 'hsl(345 50% 55%)' : 'hsl(345 65% 60%)';

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: tabBarBackgroundColor,
          borderTopColor: colorScheme === 'dark' ? 'hsl(30 10% 25%)' : 'hsl(30 30% 85%)',
        },
        tabBarActiveTintColor: tabBarActiveTintColor,
      }}
    >
      <Tabs.Screen name='index' options={{
        title: 'Dashboard',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
        ),
      }} />
      <Tabs.Screen name='privateJournal' options={{
        title: 'Private Journal',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="book-lock" color={color} size={size} />
        ),
      }} />
      <Tabs.Screen name='healthTracker' options={{
        title: 'Health Tracker',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="heart-pulse" color={color} size={size} />
        ),
      }} />
      <Tabs.Screen name='aiSupport' options={{
        title: 'Gentle AI Support',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="robot-love" color={color} size={size} />
        ),
      }} />

    </Tabs>
  )
}

export default _layout