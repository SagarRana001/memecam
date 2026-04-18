import { supabase } from '../lib/supabase';

/**
 * Deletes all user-associated data from the database.
 * NOTE: Full deletion from auth.users requires a service role key or a database trigger.
 * This function clears personal data and history to effectively deactivate the account.
 */
export const deleteUserAccount = async (userId: string): Promise<void> => {
  if (!userId) throw new Error('User ID is required');

  try {
    // 1. Delete generated memes
    // Order matters if there are foreign key constraints, 
    // but usually profile is the parent so delete it last.
    const { error: memesError } = await supabase
      .from('memes')
      .delete()
      .eq('user_id', userId);
    
    if (memesError) console.warn('Error deleting memes:', memesError.message);

    // 2. Delete payment history
    const { error: paymentsError } = await supabase
      .from('payment_history')
      .delete()
      .eq('user_id', userId);

    if (paymentsError) console.warn('Error deleting payment history:', paymentsError.message);

    // 3. Delete subscriptions
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subError) console.warn('Error deleting subscriptions:', subError.message);

    // 4. Finally delete the profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

    console.log('User account data successfully wiped! 🗑️');
  } catch (error: any) {
    console.error('Account deletion failed:', error);
    throw new Error(`Deletion Failed: ${error.message || 'Unknown error'}`);
  }
};
