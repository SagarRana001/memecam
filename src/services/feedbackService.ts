import { supabase } from '../lib/supabase';

/**
 * Submits user feedback to the database.
 * The feedback is stored securely and cannot be retrieved by users.
 */
export const submitFeedback = async (content: string, userId?: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('feedback')
      .insert([
        {
          content,
          user_id: userId || null,
        }
      ]);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to submit feedback:', err);
    return false;
  }
};
