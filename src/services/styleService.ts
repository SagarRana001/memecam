import { supabase } from '../lib/supabase';

const DEFAULT_STYLES = ['Funny', 'Dark', 'Roast', 'Cute'];

/**
 * Fetches all global styles from the app_styles table.
 * Falls back to DEFAULT_STYLES if the network is offline or table doesn't exist.
 */
export const getStyles = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('app_styles')
      .select('name')
      .order('name');
      
    if (error) {
      // Return default styles on error
      return DEFAULT_STYLES;
    }
    
    if (!data || data.length === 0) {
      return DEFAULT_STYLES;
    }
    
    return data.map(item => item.name);
  } catch (err) {
    // Error fetching styles
    return DEFAULT_STYLES;
  }
};

/**
 * Adds a new style to the app_styles table.
 */
export const addStyleToDb = async (name: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('app_styles')
      .insert([{ name }]);
      
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
