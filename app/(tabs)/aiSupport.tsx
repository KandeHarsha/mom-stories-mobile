import { useLocalSearchParams } from 'expo-router'
import React from 'react'
import AiSupportScreen from '../aiSupport'

const AiSupport = () => {
  const params = useLocalSearchParams()
  return <AiSupportScreen initialQuestion={params.question as string | undefined} />
}

export default AiSupport