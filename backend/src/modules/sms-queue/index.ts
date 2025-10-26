/**
 * SMS Queue Module
 * Exports SMS queue service and helper functions
 */

export { smsQueue } from './queue.js';
export type { QueuedMessage, QueueStats } from './types.js';

/**
 * Helper function to queue SMS messages
 */
export async function queueSms(params: {
  to: string;
  message: string;
  priority?: 'high' | 'normal' | 'low';
}): Promise<string> {
  return smsQueue.add({
    to: params.to,
    message: params.message,
    priority: params.priority || 'normal'
  });
}
