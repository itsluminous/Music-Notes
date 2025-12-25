/**
 * Debug Logger for Cache Operations
 * 
 * Provides centralized logging for cache operations with environment-based control.
 * Logging is enabled when NEXT_PUBLIC_DEBUG_LOG=true in environment variables.
 */

/**
 * Check if debug logging is enabled via environment variable
 */
export function isEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEBUG_LOG === 'true';
}

/**
 * Format timestamp for log messages
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format log message with timestamp and prefix
 */
function formatMessage(operation: string, details: string): string {
  return `[Cache] ${getTimestamp()} | ${operation} | ${details}`;
}

/**
 * Log a cache hit event
 * @param recordCount - Number of records found in cache
 * @param age - Age of cache in milliseconds
 */
export function logCacheHit(recordCount: number, age: number): void {
  if (!isEnabled()) return;
  
  const ageInHours = (age / (1000 * 60 * 60)).toFixed(1);
  const message = formatMessage(
    'Hit',
    `Age: ${ageInHours} hours | Records: ${recordCount} notes`
  );
  console.log(message);
}

/**
 * Log a cache miss event
 * @param reason - Reason for cache miss
 */
export function logCacheMiss(reason: string): void {
  if (!isEnabled()) return;
  
  const message = formatMessage('Miss', `Reason: ${reason}`);
  console.log(message);
}

/**
 * Log a cache invalidation event
 * @param reason - Reason for cache invalidation
 */
export function logCacheInvalidation(reason: string): void {
  if (!isEnabled()) return;
  
  const message = formatMessage('Invalidation', `Reason: ${reason}`);
  console.log(message);
}

/**
 * Log an incremental fetch operation
 * @param lastTimestamp - Last update timestamp used for incremental fetch
 * @param newRecords - Number of new records fetched
 */
export function logIncrementalFetch(lastTimestamp: string, newRecords: number): void {
  if (!isEnabled()) return;
  
  const message = formatMessage(
    'Incremental Fetch',
    `Since: ${lastTimestamp} | New: ${newRecords} records`
  );
  console.log(message);
}

/**
 * Log a merge operation
 * @param updated - Number of records updated
 * @param added - Number of records added
 */
export function logMergeOperation(updated: number, added: number): void {
  if (!isEnabled()) return;
  
  const message = formatMessage(
    'Merge',
    `Updated: ${updated} records | Added: ${added} records`
  );
  console.log(message);
}

/**
 * Log a full fetch operation
 * @param duration - Duration of fetch in milliseconds
 * @param recordCount - Total number of records fetched
 */
export function logFullFetch(duration: number, recordCount: number): void {
  if (!isEnabled()) return;
  
  const message = formatMessage(
    'Full Fetch',
    `Duration: ${duration}ms | Records: ${recordCount} notes`
  );
  console.log(message);
}

/**
 * Log an error during cache operations
 * Note: Error logs may output even when debug logging is disabled
 * @param operation - Operation that failed
 * @param error - Error object
 */
export function logError(operation: string, error: Error): void {
  const message = formatMessage(
    `Error - ${operation}`,
    `${error.message}`
  );
  console.error(message, error);
}
