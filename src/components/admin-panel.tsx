"use client"

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/hooks/use-auth';
import { CheckCircle, XCircle, Loader2, Pencil, Check, X } from 'lucide-react';
import { Input } from "@/components/ui/input";

interface AdminPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Admin Panel Component
 * 
 * Provides user management interface for administrators to:
 * - View all users organized by role (pending, approved, admin, rejected)
 * - Approve pending users to grant them create/edit permissions
 * - Reject pending users to deny access
 * 
 * The panel prominently displays pending users at the top to facilitate
 * quick approval workflow. Only accessible to users with 'admin' role.
 */
export function AdminPanel({ open, onOpenChange }: AdminPanelProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  /**
   * Fetch all users from user_profiles table
   * Orders by creation date (newest first) to show recent signups prominently
   */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(data as UserProfile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Approve a pending user
   * 
   * Updates the user's role to 'approved', granting them permission to
   * create, edit, and delete notes. Records the approval timestamp and
   * the admin who approved them for audit purposes.
   */
  const approveUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id, // Track which admin approved this user
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error approving user:', error);
        return;
      }

      // Refresh user list to show updated status
      await fetchUsers();
    } catch (error) {
      console.error('Error approving user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Update user's display name
   * 
   * Allows admin to set a friendly display name for any user.
   * This name is used for attribution when displaying note authors.
   */
  const updateUserName = async (userId: string, newName: string) => {
    try {
      setActionLoading(userId);
      const { error } = await supabase
        .from('user_profiles')
        .update({
          name: newName.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user name:', error);
        alert(`Failed to update name: ${error.message}`);
        return;
      }

      // Refresh user list to show updated name
      await fetchUsers();
      setEditingUserId(null);
      setEditingName('');
    } catch (error) {
      console.error('Error updating user name:', error);
      alert('Failed to update name. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Start editing a user's name
   */
  const startEditingName = (userId: string, currentName: string | null | undefined) => {
    setEditingUserId(userId);
    setEditingName(currentName || '');
  };

  /**
   * Cancel editing a user's name
   */
  const cancelEditingName = () => {
    setEditingUserId(null);
    setEditingName('');
  };

  /**
   * Reject/Remove a user
   * 
   * Deletes the user profile from user_profiles table.
   * The user will still exist in auth.users temporarily, but when they
   * try to login, the app will detect the missing profile and:
   * 1. Show them a rejection message
   * 2. Sign them out automatically
   * 3. Delete their auth.users record
   * 
   * This approach avoids needing service role keys on the server.
   */
  const rejectUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      
      // Delete the user profile
      // The user can still login temporarily, but will be handled on next login
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('Error deleting user profile:', profileError);
        alert(`Failed to remove user: ${profileError.message}`);
        return;
      }

      // Refresh user list
      await fetchUsers();
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  /**
   * Organize users by role for display
   * 
   * Separating users by role allows us to:
   * - Display pending users prominently at the top
   * - Group users logically for easier management
   * - Show role-specific information and actions
   */
  const pendingUsers = users.filter(u => u.role === 'pending');
  const approvedUsers = users.filter(u => u.role === 'approved');
  const adminUsers = users.filter(u => u.role === 'admin');
  const rejectedUsers = users.filter(u => u.role === 'rejected');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'approved':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  /**
   * Render user info with inline name editing
   */
  const renderUserInfo = (user: UserProfile) => {
    const isEditing = editingUserId === user.id;
    
    return (
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Enter display name"
                className="h-8 max-w-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateUserName(user.id, editingName);
                  } else if (e.key === 'Escape') {
                    cancelEditingName();
                  }
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => updateUserName(user.id, editingName)}
                disabled={actionLoading === user.id}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={cancelEditingName}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <p className="font-medium">{user.name || user.email}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => startEditingName(user.id, user.name)}
                  title="Edit display name"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {user.role}
              </Badge>
            </>
          )}
        </div>
        {!isEditing && (
          <p className="text-sm text-muted-foreground">
            {user.name && <span className="mr-2">Email: {user.email}</span>}
            {!user.name && `Signed up: ${formatDate(user.created_at)}`}
            {user.name && user.approved_at && ` • Approved: ${formatDate(user.approved_at)}`}
            {user.name && !user.approved_at && ` • Signed up: ${formatDate(user.created_at)}`}
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>User Management</DialogTitle>
          <DialogDescription>
            Manage user access and approvals
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            {/* Pending Users Section - Prominently displayed */}
            {pendingUsers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-orange-600 dark:text-orange-400">
                  Pending Approval ({pendingUsers.length})
                </h3>
                <div className="space-y-3">
                  {pendingUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900"
                    >
                      {renderUserInfo(user)}
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveUser(user.id)}
                          disabled={actionLoading === user.id}
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectUser(user.id)}
                          disabled={actionLoading === user.id}
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-6" />
              </div>
            )}

            {/* Admin Users Section */}
            {adminUsers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Administrators ({adminUsers.length})
                </h3>
                <div className="space-y-2">
                  {adminUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      {renderUserInfo(user)}
                    </div>
                  ))}
                </div>
                <Separator className="my-6" />
              </div>
            )}

            {/* Approved Users Section */}
            {approvedUsers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Approved Users ({approvedUsers.length})
                </h3>
                <div className="space-y-2">
                  {approvedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      {renderUserInfo(user)}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectUser(user.id)}
                        disabled={actionLoading === user.id}
                        className="ml-4"
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-1" />
                            Remove
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
                <Separator className="my-6" />
              </div>
            )}

            {/* Rejected Users Section */}
            {rejectedUsers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Rejected Users ({rejectedUsers.length})
                </h3>
                <div className="space-y-2">
                  {rejectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      {renderUserInfo(user)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
