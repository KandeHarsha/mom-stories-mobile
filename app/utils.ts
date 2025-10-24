import * as SecureStore from 'expo-secure-store';


export const fetchAccessToken = async (): Promise<string | null> => {
    try {
        const token = await SecureStore.getItemAsync('accessToken');
        return token;
    } catch (error) {
        console.error('Error fetching access token:', error);
        return null;
    }
};