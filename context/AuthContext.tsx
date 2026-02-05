import { fetchAccessToken } from '@/app/utils';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from "react"; // Explicitly import React
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SessionState {
  accessToken: string
  refreshToken?: string
  tokenExpiry?: string
}

interface AuthContextType {
  session: SessionState | null;
  signin: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, phase: string) => Promise<{ success: boolean; autoLogin: boolean }>;
  logout: () => Promise<void>;
  user: any;
  selectedChildId: string | null;
  setSelectedChildId: (childId: string | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  signin: async () => { },
  signup: async () => ({ success: false, autoLogin: false }),
  logout: async () => { },
  user: null,
  selectedChildId: null,
  setSelectedChildId: () => {},
  refreshUser: async () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionState | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await fetchAccessToken();
        
        if (token) {
          // Try to fetch user data
          try {
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_API_URL}/user`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
              }
            );
            
            if (response.ok) {
              const responseData = await response.json();
              
              // Handle nested user object structure
              const userData = responseData.user || responseData;
              setUser(userData || null);
              setSession({ accessToken: token });
              
              // Auto-select first child if childrenIds array exists
              if (userData?.childrenIds && userData.childrenIds.length > 0) {
                setSelectedChildId(userData.childrenIds[0]);
              } else if (userData?.childId) {
                // Fallback to old childId field for backward compatibility
                setSelectedChildId(userData.childId);
              } else {
              }
            }
          } catch (error) {
            console.error('AuthContext: Error fetching user:', error);
          }
        }
      } catch (error) {
        console.error("AuthContext: Failed to initialize auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const refreshUser = async () => {
    if (!session?.accessToken) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/user`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.accessToken}`
          },
        }
      );
      
      if (response.ok) {
        const responseData = await response.json();
        
        // Handle nested user object structure
        const userData = responseData.user || responseData;
        setUser(userData || null);
        
        // Auto-select first child if childrenIds array exists and no child is selected
        if (!selectedChildId && userData?.childrenIds && userData.childrenIds.length > 0) {
          setSelectedChildId(userData.childrenIds[0]);
        }
      }
    } catch (error) {
      console.error('RefreshUser: Error fetching user:', error);
    }
  };

  const signin = async (email: string, password: string) => {
    setLoading(true)
    try {      
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/auth/sign-in/email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": `${process.env.EXPO_PUBLIC_API_URL}`
          },
          body: JSON.stringify({ email, password }),
        }
      );      
      if (response.ok) {
        const responseData = await response.json();

        setSession({
          accessToken: responseData.token || "",
        })

        await SecureStore.setItemAsync('accessToken', responseData.token);

        // Handle nested user object structure
        const userData = responseData.user || responseData;
        setUser(userData || null);
        
        // Auto-select first child if childrenIds array exists
        
        if (userData?.childrenIds && userData.childrenIds.length > 0) {
          setSelectedChildId(userData.childrenIds[0]);
        } else if (userData?.childId) {
          // Fallback to old childId field for backward compatibility
          setSelectedChildId(userData.childId);
        }

      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || errorData.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, phase: string): Promise<{ success: boolean; autoLogin: boolean }> => {
    try {
      
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/auth/sign-up/email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": `${process.env.EXPO_PUBLIC_API_URL}`
          },
          body: JSON.stringify({ name, email, password, phase }),
        }
      );
      
      
      const responseData = await response.json();
      
      if (response.ok && responseData.token) {
        // Check if we have both user and token for auto-login
        if (responseData.user && responseData.token) {
          
          // Handle nested user object structure
          const userData = responseData.user.user || responseData.user;
          
          // Set session and user data
          setSession({ accessToken: responseData.token });
          setUser(userData);
          
          // Store token in secure storage
          await SecureStore.setItemAsync('accessToken', responseData.token);
          
          // Auto-select first child if childrenIds array exists
          if (userData?.childrenIds && userData.childrenIds.length > 0) {
            setSelectedChildId(userData.childrenIds[0]);
          } else if (userData?.childId) {
            // Fallback to old childId field for backward compatibility
            setSelectedChildId(userData.childId);
          }
          
          return { success: true, autoLogin: true };
        } else {
          return { success: true, autoLogin: false };
        }
      } else {
        return { success: false, autoLogin: false };
      }
    } catch (error) {
      console.error('Signup: Network error:', error);
      return { success: false, autoLogin: false };
    }
  };

  const logout = async () => {
    try {
      setLoading(true)
      
      // Get the current access token before clearing it
      const currentToken = session?.accessToken;
      
      
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/auth/sign-out`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": `${process.env.EXPO_PUBLIC_API_URL}`,
            ...(currentToken && { "Authorization": `Bearer ${currentToken}` })
          },
          body: JSON.stringify({ token: currentToken || "" }),
        }
      );      
      if (response.ok) {
      } else {
      }
    } catch (error) {
      console.error('Logout: Network error during server logout:', error)
    } finally {
      // Always clear local session and storage regardless of server response
      setSession(null)
      setUser(null)
      setSelectedChildId(null)
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('tokenExpiry');
      setLoading(false)
    }
  };

  const contextData = {
    session,
    signin,
    signup,
    logout,
    user,
    selectedChildId,
    setSelectedChildId,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextData}>
      {loading ? (
        <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Loading...</Text>
        </SafeAreaView>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  return useContext(AuthContext)
}


export { AuthContext, AuthProvider, useAuth };

