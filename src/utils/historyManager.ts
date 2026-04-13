import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MEME_DIRECTORY = `${FileSystem.documentDirectory}memes/`;
const HISTORY_KEY = '@meme_history';

export interface MemeItem {
  id: string;
  url: string;
  caption: string;
  createdAt: number;
}

/**
 * Initializes the meme storage directory
 */
const ensureDirExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(MEME_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MEME_DIRECTORY, { intermediates: true });
  }
};

/**
 * Saves a meme URI to persistent storage and updates the history list
 */
export const saveMemeToHistory = async (tempUri: string): Promise<MemeItem> => {
  try {
    await ensureDirExists();
    
    // 1. Generate a unique filename and persistent path
    const timestamp = Date.now();
    const filename = `meme_${timestamp}.jpg`;
    const persistentUri = `${MEME_DIRECTORY}${filename}`;
    
    // 2. Move file from cache to document directory
    await FileSystem.copyAsync({
      from: tempUri,
      to: persistentUri
    });
    
    // 3. Create the meme record
    const newMeme: MemeItem = {
      id: timestamp.toString(),
      url: persistentUri,
      caption: `FIRE MEME ${new Date().toLocaleDateString()}`,
      createdAt: timestamp,
    };
    
    // 4. Update AsyncStorage list
    const existingHistory = await getMemeHistory();
    const newHistory = [newMeme, ...existingHistory];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    
    return newMeme;
  } catch (error) {
    console.error('Failed to save meme to history:', error);
    throw new Error('Storage Error: Could not save meme permanently.');
  }
};

/**
 * Retrieves the full list of saved memes
 */
export const getMemeHistory = async (): Promise<MemeItem[]> => {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to retrieve history:', error);
    return [];
  }
};

/**
 * Deletes a meme from both the file system and history index
 */
export const deleteMemeFromHistory = async (id: string) => {
  try {
    const history = await getMemeHistory();
    const memeToDelete = history.find(m => m.id === id);
    
    if (memeToDelete) {
      // Remove from file system
      const fileInfo = await FileSystem.getInfoAsync(memeToDelete.url);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(memeToDelete.url);
      }
      
      // Remove from history list
      const newHistory = history.filter(m => m.id !== id);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    }
  } catch (error) {
    console.error('Failed to delete meme:', error);
  }
};
