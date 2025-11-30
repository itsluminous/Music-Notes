import { supabase } from './supabase';

// Global flag to prevent multiple deletion checks
let deletionCheckInProgress = false;
let deletionDialogShown = false;

/**
 * Checks if a database error is due to a removed user profile and handles the removal flow.
 * 
 * This function:
 * 1. Checks if the error is an RLS policy violation
 * 2. Verifies if the user profile was deleted
 * 3. Dispatches an event to show the removal dialog
 * 4. Deletes the auth user and signs them out
 * 
 * @param userId - The user ID to check
 * @param error - The database error that occurred
 */
export async function handlePotentialAccountRemoval(userId: string, error: any): Promise<void> {
  // Only check for RLS policy errors
  if (!error || (error.code !== '42501' && !error.message?.includes('policy'))) {
    return;
  }

  // Prevent multiple simultaneous checks
  if (deletionCheckInProgress) {
    return;
  }

  deletionCheckInProgress = true;

  try {
    const { error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    // If profile doesn't exist (404), user was removed by admin
    if (profileError && profileError.code === 'PGRST116') {
      // Trigger the dialog event FIRST, before any auth changes
      // This ensures the dialog is shown while the component is still mounted
      if (!deletionDialogShown) {
        deletionDialogShown = true;
        window.dispatchEvent(new CustomEvent('account-removed'));

        // Reset flag after a delay
        setTimeout(() => {
          deletionDialogShown = false;
          deletionCheckInProgress = false;
        }, 5000);
      }

      // Small delay to ensure the dialog is rendered before auth changes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Delete the auth user first (self-deletion is allowed)
      // This must be done BEFORE signOut() because we need the session
      try {
        await supabase.rpc('delete_own_account');
      } catch (deleteError) {
        console.error('Error deleting auth user:', deleteError);
      }

      // Sign out the user after deletion
      await supabase.auth.signOut();
    }
  } catch (checkError) {
    console.error('Error checking user profile:', checkError);
  } finally {
    deletionCheckInProgress = false;
  }
}
