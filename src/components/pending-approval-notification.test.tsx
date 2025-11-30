import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PendingApprovalNotification } from './pending-approval-notification';

/**
 * Unit tests for PendingApprovalNotification component
 * 
 * These tests validate Requirements 5.2, 5.4:
 * - WHEN a pending user logs in THEN display notification indicating admin approval is pending
 * - WHEN a pending user clicks create or edit buttons THEN display the pending approval notification
 */

describe('PendingApprovalNotification', () => {
  describe('Notification displays for pending users', () => {
    it('should display notification when isOpen is true', () => {
      const mockOnOpenChange = vi.fn();
      
      render(
        <PendingApprovalNotification
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          email="pending@example.com"
        />
      );

      // Check that the notification is displayed
      expect(screen.getByText('Approval Pending')).toBeInTheDocument();
      expect(screen.getByText(/Your account is currently awaiting admin approval/)).toBeInTheDocument();
    });

    it('should not display notification when isOpen is false', () => {
      const mockOnOpenChange = vi.fn();
      
      render(
        <PendingApprovalNotification
          isOpen={false}
          onOpenChange={mockOnOpenChange}
          email="pending@example.com"
        />
      );

      // Check that the notification is not displayed
      expect(screen.queryByText('Approval Pending')).not.toBeInTheDocument();
    });

    it('should display user email when provided', () => {
      const mockOnOpenChange = vi.fn();
      const testEmail = 'pending@example.com';
      
      render(
        <PendingApprovalNotification
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          email={testEmail}
        />
      );

      // Check that the email is displayed
      expect(screen.getByText(testEmail)).toBeInTheDocument();
    });

    it('should not display email section when email is not provided', () => {
      const mockOnOpenChange = vi.fn();
      
      render(
        <PendingApprovalNotification
          isOpen={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Check that the Account label is not displayed
      expect(screen.queryByText('Account:')).not.toBeInTheDocument();
    });
  });

  describe('Notification shows on edit attempts', () => {
    it('should call onOpenChange when user clicks "I Understand" button', () => {
      const mockOnOpenChange = vi.fn();
      
      render(
        <PendingApprovalNotification
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          email="pending@example.com"
        />
      );

      // Click the "I Understand" button
      const button = screen.getByText('I Understand');
      fireEvent.click(button);

      // Check that onOpenChange was called with false
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should display clear messaging about approval process', () => {
      const mockOnOpenChange = vi.fn();
      
      render(
        <PendingApprovalNotification
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          email="pending@example.com"
        />
      );

      // Check that clear messaging is displayed
      expect(screen.getByText(/you can view all notes/i)).toBeInTheDocument();
      expect(screen.getByText(/won't be able to create or edit notes/i)).toBeInTheDocument();
      expect(screen.getByText(/admin will review your account/i)).toBeInTheDocument();
    });

    it('should display icon indicating pending status', () => {
      const mockOnOpenChange = vi.fn();
      
      render(
        <PendingApprovalNotification
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          email="pending@example.com"
        />
      );

      // Check that the Clock icon is rendered (by checking for the svg element)
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with app flow', () => {
    it('should be controllable via isOpen prop', () => {
      const mockOnOpenChange = vi.fn();
      
      const { rerender } = render(
        <PendingApprovalNotification
          isOpen={false}
          onOpenChange={mockOnOpenChange}
          email="pending@example.com"
        />
      );

      // Initially not visible
      expect(screen.queryByText('Approval Pending')).not.toBeInTheDocument();

      // Rerender with isOpen=true
      rerender(
        <PendingApprovalNotification
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          email="pending@example.com"
        />
      );

      // Now visible
      expect(screen.getByText('Approval Pending')).toBeInTheDocument();
    });
  });
});
