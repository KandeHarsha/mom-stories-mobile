// Temporarily using AsyncStorage instead of SecureStore
// TODO: Switch back to SecureStore after rebuilding the app
import AsyncStorage from '@react-native-async-storage/async-storage';

export const fetchAccessToken = async (): Promise<string | null> => {
    try {
        const token = await AsyncStorage.getItem('accessToken');
        return token;
    } catch (error) {
        console.error('Error fetching access token:', error);
        return null;
    }
};