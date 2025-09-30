import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const TOKEN_KEY = 'access_token'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY)
      if (storedToken) {
        setToken(storedToken)
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (token: string) => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token)
      setToken(token)
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Error storing token:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error('Error removing token:', error)
    }
  }

  return {
    isAuthenticated,
    token,
    loading,
    login,
    logout,
  }
}

// Also export as default for compatibility
export default useAuth