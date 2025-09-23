"use client"

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
import { User, Download, Sun, Moon, Power } from "lucide-react"
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/components/theme-provider'
import { useNotesData } from '@/hooks/use-notes-data'

export function UserNav() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { notes, tags } = useNotesData();

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
    const exportData = notes.map(note => {
      const noteTags = note.tags.map(tagId => tags.find(t => t.id === tagId)?.name).filter(Boolean);
      return {
        title: note.title,
        metadata: note.metadata || "",
        content: note.content,
        references: note.references || "",
        labels: noteTags,
        is_pinned: false,
        created_at_iso: note.created_at,
        updated_at_iso: note.updated_at,
        artist: note.artist || "",
        album: note.album || "",
        release_year: note.release_year || null
      };
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `music-notes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  return (
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
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{loading ? 'Loading...' : (user?.email ?? 'Not signed in')}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onSelect={handleExportNotes}>
            <Download className="mr-2 h-4 w-4" />
            Export Notes
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); handleSignOut() }}>
          <Power className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
