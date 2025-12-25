"use client"

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getCacheStatistics, clearCache, type CacheStatistics } from '@/lib/cache-manager';
import { Database, Trash2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CacheInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Cache Info Dialog Component
 * 
 * Displays cache statistics and provides cache management utilities.
 * Only accessible to admin users.
 * 
 * Features:
 * - View cache age, size, and record counts
 * - Check cache validity status
 * - Clear cache manually for debugging/troubleshooting
 * - Refresh statistics in real-time
 */
export function CacheInfoDialog({ open, onOpenChange }: CacheInfoDialogProps) {
  const [stats, setStats] = useState<CacheStatistics | null>(null);
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();

  /**
   * Load cache statistics
   */
  const loadStats = () => {
    const cacheStats = getCacheStatistics();
    setStats(cacheStats);
  };

  /**
   * Clear cache and refresh statistics
   */
  const handleClearCache = () => {
    setClearing(true);
    
    try {
      clearCache();
      
      toast({
        title: "Cache cleared",
        description: "Local storage cache has been cleared successfully.",
      });
      
      // Refresh statistics after clearing
      setTimeout(() => {
        loadStats();
        setClearing(false);
      }, 100);
    } catch (error) {
      toast({
        title: "Error clearing cache",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
      setClearing(false);
    }
  };

  /**
   * Load statistics when dialog opens
   */
  useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [open]);

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Information
          </DialogTitle>
          <DialogDescription>
            View and manage local storage cache
          </DialogDescription>
        </DialogHeader>

        {stats && (
          <div className="space-y-4">
            {/* Cache Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={stats.exists ? (stats.isValid ? "default" : "destructive") : "outline"}>
                {stats.exists ? (
                  stats.isValid ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Valid
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Expired
                    </>
                  )
                ) : (
                  'No Cache'
                )}
              </Badge>
            </div>

            <Separator />

            {/* Cache Statistics */}
            {stats.exists ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cache Age</span>
                    <span className="text-sm font-medium">{stats.ageFormatted}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cache Size</span>
                    <span className="text-sm font-medium">{stats.sizeFormatted}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Notes Cached</span>
                    <span className="text-sm font-medium">{stats.noteCount.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tags Cached</span>
                    <span className="text-sm font-medium">{stats.tagCount.toLocaleString()}</span>
                  </div>
                </div>

                <Separator />

                {/* Timestamps */}
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Cached At</div>
                    <div className="text-xs font-mono bg-muted p-2 rounded">
                      {formatTimestamp(stats.cachedAt)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Last Update</div>
                    <div className="text-xs font-mono bg-muted p-2 rounded">
                      {formatTimestamp(stats.lastUpdateTimestamp)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No cache data found</p>
                <p className="text-xs mt-1">Cache will be created on next data fetch</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={loadStats}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          {stats?.exists && (
            <Button
              variant="destructive"
              onClick={handleClearCache}
              disabled={clearing}
              className="w-full sm:w-auto"
            >
              {clearing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cache
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
