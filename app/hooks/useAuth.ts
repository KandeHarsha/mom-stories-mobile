import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const TOKEN_KEY = 'access_token'
const PROFILE_KEY = 'user_profile'

interface UserProfile {
  ID: string
  FullName: string
  FirstName: string
  LastName: string | null
  Email: Array<{ Type: string; Value: string }>
  ImageUrl: string | null
  ThumbnailImageUrl: string | null
  Company: string | null
  LocalCity: string | null
  LocalCountry: string | null
  CreatedDate: string
  LastLoginDate: string
}

// Helper function to parse login response and extract profile
const parseLoginResponse = (response: any): { token: string; profile: UserProfile } => {
  
  const data = response.data || response
  
  const profile = data.Profile
  
  const token = data.access_token;
  
  if (!token) {
    throw new Error("No access token found in response");
  }
  
  if (!profile) {
    throw new Error("No profile data found in response");
  }
  
  const parsedProfile = {
    ID: profile.ID,
    FullName: profile.FullName,
    FirstName: profile.FirstName,
    LastName: profile.LastName,
    Email: profile.Email,
    ImageUrl: profile.ImageUrl || profile.Identities?.[0]?.ImageUrl,
    ThumbnailImageUrl: profile.ThumbnailImageUrl || profile.Identities?.[0]?.ThumbnailImageUrl,
    Company: profile.Company,
    LocalCity: profile.LocalCity,
    LocalCountry: profile.LocalCountry,
    CreatedDate: profile.CreatedDate,
    LastLoginDate: profile.LastLoginDate,
  };
  
  
  return {
    token,
    profile: parsedProfile
  }
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY)
      const storedProfile = await AsyncStorage.getItem(PROFILE_KEY)
      
      
      if (storedToken && storedToken.trim() !== '') {
        setToken(storedToken)
        setIsAuthenticated(true)
        
        if (storedProfile) {
          try {
            const parsedProfile = JSON.parse(storedProfile);
            setUser(parsedProfile)
          } catch (parseError) {
            // Clear invalid profile data
            await AsyncStorage.removeItem(PROFILE_KEY);
          }
        }
      } else {
        setIsAuthenticated(false);
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      // On error, assume not authenticated
      setIsAuthenticated(false);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false)
    }
  }

  const login = async (token: string, profile?: UserProfile) => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token)
      
      setToken(token)
      setIsAuthenticated(true)
      
      if (profile) {
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
        setUser(profile)
      }
      
      // Log final state
    } catch (error) {
      console.error('❌ Error storing auth data:', error)
      throw error
    }
  }

  const loginWithResponse = async (loginResponse: any) => {
    try {
      const { token, profile } = parseLoginResponse(loginResponse)
      await login(token, profile)
      
      // Force a small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('❌ Error processing login response:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY])
      
      // Update state synchronously
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
      
      // Force a small delay to ensure state propagation
      setTimeout(() => {
        console.log("🔄 Triggering auth state check after logout");
      }, 100);
      
    } catch (error) {
      console.error('❌ Error removing auth data:', error)
    }
  }

  return {
    isAuthenticated,
    token,
    user,
    loading,
    login,
    loginWithResponse,
    logout,
  }
}

// Also export as default for compatibility
export default useAuth