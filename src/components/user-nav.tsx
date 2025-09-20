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
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export function UserNav() {
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');
  const router = useRouter();
  const { user, loading } = useAuth();

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            {userAvatar ? (
               <Image 
                src={userAvatar.imageUrl} 
                alt="User Avatar"
                width={40}
                height={40}
                className="rounded-full"
                data-ai-hint={userAvatar.imageHint}
              />
            ) : (
              <AvatarImage src="/placeholder-user.jpg" alt="@shadcn" />
            )}
            <AvatarFallback>USER</AvatarFallback>
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
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleSignOut() }}>
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
