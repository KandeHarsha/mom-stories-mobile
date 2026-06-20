import { fetchAccessToken } from '@/app/utils';
import { authClient } from '@/app/lib/auth-client';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
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
  signinWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  user: any;
  selectedChildId: string | null;
  setSelectedChildId: (childId: string | null) => void;
  refreshUser: () => Promise<void>;
  getApiHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  signin: async () => { },
  signup: async () => ({ success: false, autoLogin: false }),
  signinWithGoogle: async () => { },
  logout: async () => { },
  user: null,
  selectedChildId: null,
  setSelectedChildId: () => {},
  refreshUser: async () => {},
  getApiHeaders: () => ({ 'Content-Type': 'application/json' }),
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
              }
            } else {
              // /api/user rejected the token (e.g. Google OAuth session) —
              // fall back to Better Auth's own session endpoint
              const { data: sessionData } = await authClient.getSession();
              if (sessionData?.session?.token) {
                const userData = sessionData.user as any;
                setSession({ accessToken: sessionData.session.token });
                setUser(userData || null);
                if (userData?.childrenIds && userData.childrenIds.length > 0) {
                  setSelectedChildId(userData.childrenIds[0]);
                } else if (userData?.childId) {
                  setSelectedChildId(userData.childId);
                }
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

  const signinWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: Linking.createURL("/"),
      });

      if (error) {
        alert(error.message || 'Google sign-in failed. Please try again.');
        return;
      }

      // Retrieve the session token from the Better Auth client
      const { data: sessionData } = await authClient.getSession();

      if (!sessionData?.session?.token) {
        alert('Google sign-in failed. Could not retrieve session.');
        return;
      }

      const token = sessionData.session.token;
      await SecureStore.setItemAsync('accessToken', token);
      setSession({ accessToken: token });

      // Use the user data already returned by getSession() —
      // avoids a separate /api/user call that may not accept OAuth tokens
      const userData = sessionData.user as any;
      setUser(userData || null);

      if (userData?.childrenIds && userData.childrenIds.length > 0) {
        setSelectedChildId(userData.childrenIds[0]);
      } else if (userData?.childId) {
        setSelectedChildId(userData.childId);
      }
    } catch (error) {
      alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
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

  const getApiHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    // Include the Better Auth cookie so OAuth sessions work even if the backend
    // doesn't accept Bearer tokens for OAuth-created sessions
    const cookie = authClient.getCookie();
    if (cookie) {
      headers['Cookie'] = cookie;
    }
    return headers;
  };

  const contextData = {
    session,
    signin,
    signup,
    signinWithGoogle,
    logout,
    user,
    selectedChildId,
    setSelectedChildId,
    refreshUser,
    getApiHeaders,
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

