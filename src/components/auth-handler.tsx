"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function AuthHandler() {
 const router = useRouter();
 const pathname = usePathname();

 useEffect(() => {
   const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
     if (event === 'PASSWORD_RECOVERY') {
       router.push('/auth/update-password');
     }
   });

   return () => subscription.unsubscribe();
 }, [router]);

 return null;
}
