import { supabase } from '../lib/supabase';
import { SelectionOption } from './languageService';

const DEFAULT_STYLES: SelectionOption[] = [
  { name: 'Funny', likes: 120 },
  { name: 'Dark', likes: 95 },
  { name: 'Roast', likes: 150 },
  { name: 'Cute', likes: 60 },
];

/**
 * Fetches all global styles from the app_styles table.
 * Falls back to DEFAULT_STYLES if the network is offline or table doesn't exist.
 */
export const getStyles = async (): Promise<SelectionOption[]> => {
  try {
    const { data, error } = await supabase
      .from('app_styles')
      .select('name, likes')
      .order('likes', { ascending: false });
      
    if (error) {
      // Return default styles on error
      return DEFAULT_STYLES.sort((a, b) => b.likes - a.likes);
    }
    
    if (!data || data.length === 0) {
      return DEFAULT_STYLES.sort((a, b) => b.likes - a.likes);
    }
    
    return data.map(item => ({
      name: item.name,
      likes: item.likes || 0
    }));
  } catch (err) {
    // Error fetching styles
    return DEFAULT_STYLES.sort((a, b) => b.likes - a.likes);
  }
};

/**
 * Adds a new style to the app_styles table.
 */
export const addStyleToDb = async (name: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('app_styles')
      .insert([{ name, likes: 1 }]); // Start with 1 like when added
      
    if (error) {
      // If it's a unique constraint violation, that's fine, it already exists.
      if (error.code === '23505') return true;
      throw error;
    }
    return true;
  } catch (err) {
    // Failed to add style
    return false;
  }
};

/**
 * Increments the like count for a style.
 */
export const likeStyle = async (name: string): Promise<void> => {
  try {
    const { error } = await supabase
      .rpc('increment_style_likes', { style_name: name });
    
    if (error) {
      console.warn('RPC missing, falling back to manual increment:', error.message);
      // Fallback: Fetch current likes then increment
      const { data } = await supabase
        .from('app_styles')
        .select('likes')
        .eq('name', name)
        .single();
      
      await supabase
        .from('app_styles')
        .update({ likes: (data?.likes || 0) + 1 })
        .eq('name', name);
    }
  } catch (err) {
    console.error('Failed to like style:', err);
  }
};
