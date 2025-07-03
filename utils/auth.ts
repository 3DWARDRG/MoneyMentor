// utils/auth.ts
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

const useSecure = Platform.OS !== 'web'

export const getToken = async (): Promise<string | null> => {
  if (useSecure) {
    return await SecureStore.getItemAsync('authToken')
  } else {
    return await AsyncStorage.getItem('authToken')
  }
}

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await getToken();
    console.log("Token encontrado:", token);
    return !!token; // Esto convierte a booleano de forma segura
  } catch (e) {
    console.warn("Error al verificar token:", e);
    return false;
  }
};
