import * as FileSystem from 'expo-file-system/legacy';
import storage from './storage';

const MEME_DIRECTORY = `${FileSystem.documentDirectory}memes/`;
const HISTORY_KEY = '@meme_history';

export interface MemeItem {
  id: string;
  url: string;
  caption: string;
  topLines?: string[];
  bottomLines?: string[];
  createdAt: number;
  style?: string;
  language?: string;
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
export const saveMemeToHistory = async (
  tempUri: string, 
  caption?: string, 
  style?: string, 
  language?: string,
  topLines?: string[],
  bottomLines?: string[]
): Promise<MemeItem> => {
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
      caption: caption || `FIRE MEME ${new Date().toLocaleDateString()}`,
      topLines,
      bottomLines,
      createdAt: timestamp,
      style: style,
      language: language,
    };
    
    // 4. Update storage list
    const existingHistory = await getMemeHistory();
    const newHistory = [newMeme, ...existingHistory];
    await storage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    
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
    const data = await storage.getItem(HISTORY_KEY);
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
      await storage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    }
  } catch (error) {
    console.error('Failed to delete meme:', error);
  }
};
/**
 * Updates an existing meme record in history (e.g., after a reload)
 */
export const updateMemeInHistory = async (id: string, updates: Partial<MemeItem>) => {
  try {
    const history = await getMemeHistory();
    const index = history.findIndex(m => m.id === id);
    
    if (index !== -1) {
      history[index] = { ...history[index], ...updates };
      await storage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  } catch (error) {
    console.error('Failed to update meme history:', error);
  }
};
