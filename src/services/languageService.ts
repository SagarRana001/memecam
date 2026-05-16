import { supabase } from '../lib/supabase';

export interface SelectionOption {
  name: string;
  likes: number;
}

const DEFAULT_LANGUAGES: SelectionOption[] = [
  { name: 'English', likes: 100 },
  { name: 'Hindi', likes: 90 },
  { name: 'Hinglish', likes: 110 },
  { name: 'Tamil', likes: 80 },
  { name: 'Telugu', likes: 70 },
];

/**
 * Fetches all global languages from the app_languages table.
 * Falls back to DEFAULT_LANGUAGES if the network is offline or table doesn't exist.
 */
export const getLanguages = async (): Promise<SelectionOption[]> => {
  try {
    const { data, error } = await supabase
      .from('app_languages')
      .select('name, likes')
      .order('likes', { ascending: false });
      
    if (error) {
      // Return default languages on error
      return DEFAULT_LANGUAGES.sort((a, b) => b.likes - a.likes);
    }
    
    if (!data || data.length === 0) {
      return DEFAULT_LANGUAGES.sort((a, b) => b.likes - a.likes);
    }
    
    return data.map(item => ({
      name: item.name,
      likes: item.likes || 0
    }));
  } catch (err) {
    // Error fetching languages
    return DEFAULT_LANGUAGES.sort((a, b) => b.likes - a.likes);
  }
};

/**
 * Adds a new language to the app_languages table.
 */
export const addLanguageToDb = async (name: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('app_languages')
      .insert([{ name, likes: 1 }]); // Start with 1 like when added
      
    if (error) {
      // If it's a unique constraint violation, that's fine, it already exists.
      if (error.code === '23505') return true;
      throw error;
    }
    return true;
  } catch (err) {
    // Failed to add language
    return false;
  }
};

/**
 * Increments the like count for a language.
 */
export const likeLanguage = async (name: string): Promise<void> => {
  try {
    // Use a RPC call or a manual increment
    // Since we don't have a specific RPC, we'll do a fetch-then-update or use Supabase's increment
    const { data, error } = await supabase
      .rpc('increment_language_likes', { lang_name: name });
    
    if (error) {
      // Fallback if RPC doesn't exist: fetch and update
      const { data: current } = await supabase
        .from('app_languages')
        .select('likes')
        .eq('name', name)
        .single();
      
      await supabase
        .from('app_languages')
        .update({ likes: (current?.likes || 0) + 1 })
        .eq('name', name);
    }
  } catch (err) {
    console.error('Failed to like language:', err);
  }
};
