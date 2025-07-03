import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveToken = async (token: string) => {
  await AsyncStorage.setItem('authToken', token);
};

export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('authToken');
};

export const removeToken = async () => {
  await AsyncStorage.removeItem('authToken');
};
