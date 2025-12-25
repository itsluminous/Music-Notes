"use client"

import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, Download, Upload, Sun, Moon, Power, Shield, Database } from "lucide-react"
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/components/theme-provider'
import { useNotesData } from '@/hooks/use-notes-data'
import { AdminPanel } from '@/components/admin-panel'
import { CacheInfoDialog } from '@/components/cache-info-dialog'
import { PendingApprovalNotification } from '@/components/pending-approval-notification'
import { exportNotes, downloadExportData, importNotes } from '@/lib/export-utils'
import { useToast } from '@/hooks/use-toast'

export function UserNav() {
  const router = useRouter();
  const { user, loading, isAdmin, isApproved, isPending } = useAuth();
  const { theme, setTheme } = useTheme();
  const { notes, tags, fetchNotesAndTags } = useNotesData();
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [cacheInfoOpen, setCacheInfoOpen] = useState(false);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Minimal error handling: log and keep user on the page
        // You can replace this with a toast notification using the project's toast hook
        // e.g. useToast or similar
        // eslint-disable-next-line no-console
        console.error('Sign out error:', error.message)
        return
      }

      // Redirect to the login page after successful sign out
      router.push('/auth/login')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Unexpected sign out error:', err)
    }
  }

  function handleExportNotes() {
    const exportData = exportNotes(notes, tags);
    downloadExportData(exportData);
  }

  function handleImportClick() {
    // Check if user is authenticated
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // Check if user is approved
    if (!isApproved) {
      setPendingDialogOpen(true);
      return;
    }
    
    fileInputRef.current?.click();
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast({
      title: "Importing notes...",
      description: "Please wait while we process your file.",
    });

    try {
      const result = await importNotes(file);
      
      if (result.success) {
        toast({
          title: "Import successful!",
          description: `Successfully imported ${result.count} note${result.count !== 1 ? 's' : ''}.`,
        });
        // Refresh notes to show imported data
        await fetchNotesAndTags();
      } else {
        toast({
          title: "Import failed",
          description: result.error || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          {!user ? (
            // Anonymous user menu
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Not signed in</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer" onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onSelect={() => router.push('/auth/login')}>
                <User className="mr-2 h-4 w-4" />
                Sign In
              </DropdownMenuItem>
            </>
          ) : (
            // Authenticated user menu
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{loading ? 'Loading...' : user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {isAdmin && (
                  <>
                    <DropdownMenuItem className="cursor-pointer" onSelect={() => setAdminPanelOpen(true)}>
                      <Shield className="mr-2 h-4 w-4" />
                      Manage Users
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onSelect={() => setCacheInfoOpen(true)}>
                      <Database className="mr-2 h-4 w-4" />
                      Cache Info
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem className="cursor-pointer" onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </DropdownMenuItem>
                {isApproved && (
                  <>
                    <DropdownMenuItem className="cursor-pointer" onSelect={handleExportNotes}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Notes
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer" 
                      onSelect={handleImportClick}
                      disabled={isImporting}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isImporting ? 'Importing...' : 'Import Notes'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); handleSignOut() }}>
                <Power className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
        <AdminPanel open={adminPanelOpen} onOpenChange={setAdminPanelOpen} />
        <CacheInfoDialog open={cacheInfoOpen} onOpenChange={setCacheInfoOpen} />
        <PendingApprovalNotification 
          isOpen={pendingDialogOpen} 
          onOpenChange={setPendingDialogOpen}
          email={user?.email}
        />
      </DropdownMenu>
    </>
  )
}
