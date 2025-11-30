import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '@/lib/types';

// Global flag to prevent multiple deletion alerts
let deletionAlertShown = false;
// Global state for the dialog to persist across re-renders
let globalShowAccountRemovedDialog = false;
let dialogStateSetters: Set<(show: boolean) => void> = new Set();

/**
 * Custom hook for authentication and user profile management
 * 
 * Provides:
 * - User authentication state (user, session)
 * - User profile with role information (admin, approved, pending, rejected)
 * - Computed role checks (isAdmin, isApproved, isPending)
 * - Loading state for async operations
 * - Account removal notification state
 * 
 * The hook automatically fetches the user profile from the user_profiles table
 * when a user authenticates, enabling role-based access control throughout the app.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAccountRemovedDialog, setShowAccountRemovedDialog] = useState(globalShowAccountRemovedDialog);
  const deletionInProgress = useRef(false);
  
  // Register this setter in the global set
  useEffect(() => {
    dialogStateSetters.add(setShowAccountRemovedDialog);
    return () => {
      dialogStateSetters.delete(setShowAccountRemovedDialog);
    };
  }, []);

  /**
   * Fetch user profile from database
   * 
   * Retrieves the user's role and approval status from the user_profiles table.
   * This information is used throughout the app to control access to features.
   * 
   * If no profile exists (user was rejected/removed by admin), this will:
   * 1. Sign out the user
   * 2. Delete their auth.users record
   * 3. Show a rejection message (only once)
   */
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist (404), user was rejected by admin
        if (error.code === 'PGRST116') {
          console.error('User profile not found - user was rejected by admin');
          
          // Prevent multiple simultaneous deletion attempts
          if (deletionInProgress.current) {
            return null;
          }
          
          deletionInProgress.current = true;
          
          // Delete the auth user (self-deletion is allowed)
          // This cleans up the orphaned auth.users record
          try {
            await supabase.rpc('delete_own_account');
          } catch (deleteError) {
            console.error('Error deleting auth user:', deleteError);
          }
          
          // Show rejection message only once
          if (!deletionAlertShown) {
            deletionAlertShown = true;
            globalShowAccountRemovedDialog = true;
            
            // Update all instances of the hook
            dialogStateSetters.forEach(setter => setter(true));

            // Sign out the user
            await supabase.auth.signOut();
            
            // Reset flag after a delay to allow future deletions
            setTimeout(() => {
              deletionAlertShown = false;
              deletionInProgress.current = false;
            }, 5000);
          }
          
          return null;
        }
        
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      
      // Fetch user profile when user authenticates
      // This ensures we have role information for access control
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    // Initial session check on mount
    // Handles page refresh or direct navigation with existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      
      // Fetch user profile for initial session
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setProfile(userProfile);
      }
      
      setLoading(false);
    });

    // Listen for account removal events triggered by CRUD operations
    const handleAccountRemoved = () => {
      if (!deletionAlertShown) {
        deletionAlertShown = true;
        globalShowAccountRemovedDialog = true;
        
        // Update all instances of the hook
        dialogStateSetters.forEach(setter => setter(true));
        
        // Reset flag after a delay
        setTimeout(() => {
          deletionAlertShown = false;
        }, 5000);
      }
    };
    
    window.addEventListener('account-removed', handleAccountRemoved);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('account-removed', handleAccountRemoved);
    };
  }, []);

  /**
   * Computed properties for role-based access control
   * 
   * - isAdmin: First user to sign up, can manage users and has full permissions
   * - isApproved: Admin or approved users, can create/edit/delete notes
   * - isPending: New users awaiting admin approval, read-only access
   */
  const isAdmin = profile?.role === 'admin';
  const isApproved = profile?.role === 'admin' || profile?.role === 'approved';
  const isPending = profile?.role === 'pending';

  // Wrapper to sync local and global state
  const setShowAccountRemovedDialogWrapper = (show: boolean) => {
    globalShowAccountRemovedDialog = show;
    dialogStateSetters.forEach(setter => setter(show));
  };

  return { 
    user, 
    session, 
    profile, 
    loading, 
    isAdmin, 
    isApproved, 
    isPending,
    showAccountRemovedDialog,
    setShowAccountRemovedDialog: setShowAccountRemovedDialogWrapper
  };
}
