import { Tabs } from 'expo-router'
import React from 'react'

const _layout = () => {
  return (
    <Tabs>
      <Tabs.Screen name='index' options={{ title: 'Dashboard', headerShown: false }} />
      <Tabs.Screen name='privateJournal' options={{ title: 'Private Journal', headerShown: false }} />
      <Tabs.Screen name='healthTracker' options={{ title: 'Health Tracker', headerShown: false }} />
      <Tabs.Screen name='aiSupport' options={{ title: 'Gentle AI Support', headerShown: false }} />

    </Tabs>
  )
}

export default _layout