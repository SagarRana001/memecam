import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A web-safe storage adapter that uses localStorage on Web
 * and AsyncStorage on Native platforms.
 */
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        // LocalStorage not available
        return null;
      }
    }
    return await AsyncStorage.getItem(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        // LocalStorage not available
      }
      return;
    }
    await AsyncStorage.setItem(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        // LocalStorage not available
      }
      return;
    }
    await AsyncStorage.removeItem(key);
  },

  // Added for Supabase compatibility if needed
  getAllKeys: async (): Promise<readonly string[]> => {
    if (Platform.OS === 'web') {
      return Object.keys(window.localStorage);
    }
    return await AsyncStorage.getAllKeys();
  }
};

export default storage;
