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
import { Clock } from 'lucide-react';

interface PendingApprovalNotificationProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  email?: string;
}

export function PendingApprovalNotification({ 
  isOpen, 
  onOpenChange,
  email 
}: PendingApprovalNotificationProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-6 w-6 text-amber-500" />
            <AlertDialogTitle className="font-headline">Approval Pending</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                Your account is currently awaiting admin approval. You can view all notes, but you won't be able to create or edit notes until your account is approved.
              </p>
              {email && (
                <p className="text-sm">
                  <span className="font-medium">Account:</span> {email}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                The admin will review your account shortly. You'll receive full access once approved.
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
