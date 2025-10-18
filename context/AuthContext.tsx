import { fetchAccessToken } from '@/app/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as SecureStore from 'expo-secure-store';
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
  logout: () => Promise<void>;
  user: any;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  signin: async () => { },
  logout: async () => { },
  user: null
});

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [user, setUser] = useState<any | null>(null)
  const [accessToken, setAccessToken] = useState("")

  useEffect(() => {
    const getToken = async () => {
      try {
        const token = await fetchAccessToken();
        setAccessToken(token || "");
      } catch (error) {
        console.error("Failed to fetch access token:", error);
      } finally {
        setLoading(false);
      }
    };

    getToken();
  }, []);

  useEffect(() => {
    checkAuth()
  }, [accessToken])

  const signin = async (email: string, password: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/auth/emailLogin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );
      if (response.ok) {
        const responseData = await response.json();

        setSession({
          accessToken: responseData.data.access_token || "",
          refreshToken: responseData.data.refresh_token || "",
          tokenExpiry: responseData.data.expires_in || "",
        })

        // await SecureStore.setItemAsync('accessToken', 'responseData.data.access_token');
        // await SecureStore.setItemAsync('refreshToken', 'responseData.data.refresh_token');
        // await SecureStore.setItemAsync('tokenExpiry', 'responseData.data.expires_in');

        await AsyncStorage.setItem('accessToken', 'responseData.data.access_token');
        await AsyncStorage.setItem('refreshToken', 'responseData.data.refresh_token');
        await AsyncStorage.setItem('tokenExpiry', 'responseData.data.expires_in');

        

        setUser(responseData.data.Profile || null)

      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || `Login failed: ${response.status} - Invalid credentials`);
      }
    } catch (error) {
      alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // TODO: Implement logout logic
    setLoading(true)
    setSession(null)
    setUser(null)
    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("refreshToken");
    await AsyncStorage.removeItem("tokenExpiry");
    setLoading(false)
  };

  const fetchUser = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/profile`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
        }
      );
      if (response.ok) {
        const responseData = await response.json();
        setUser(responseData|| null)
        setSession({accessToken: accessToken as string})

      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || `Login failed: ${response.status} - Invalid credentials`);
      }
    } catch (error) {
      alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  const checkAuth = async () => {
    if (!accessToken) return
    fetchUser()
  }

  const contextData = {
    session,
    signin,
    logout,
    user
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
