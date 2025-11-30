"use client";

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { XCircle } from 'lucide-react';

interface AccountRemovedNotificationProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AccountRemovedNotification({ 
  isOpen, 
  onOpenChange,
}: AccountRemovedNotificationProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-6 w-6 text-destructive" />
            <AlertDialogTitle className="font-headline">Account Removed</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                Your account has been removed by the administrator. You have been signed out and your account has been deleted.
              </p>
              <p className="text-sm text-muted-foreground">
                If you believe this was done in error, please contact the administrator.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            I Understand
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
