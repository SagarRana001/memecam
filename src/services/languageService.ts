import { supabase } from '../lib/supabase';

const DEFAULT_LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Tamil', 'Telugu'];

/**
 * Fetches all global languages from the app_languages table.
 * Falls back to DEFAULT_LANGUAGES if the network is offline or table doesn't exist.
 */
export const getLanguages = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('app_languages')
      .select('name')
      .order('name');
      
    if (error) {
      console.warn('Failed to fetch languages from DB', error);
      return DEFAULT_LANGUAGES;
    }
    
    if (!data || data.length === 0) {
      return DEFAULT_LANGUAGES;
    }
    
    return data.map(item => item.name);
  } catch (err) {
    console.warn('Error fetching languages', err);
    return DEFAULT_LANGUAGES;
  }
};

/**
 * Adds a new language to the app_languages table.
 */
export const addLanguageToDb = async (name: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('app_languages')
      .insert([{ name }]);
      
    if (error) {
      // If it's a unique constraint violation, that's fine, it already exists.
      if (error.code === '23505') return true;
      throw error;
    }
    return true;
  } catch (err) {
    console.error('Failed to add language', err);
    return false;
  }
};
