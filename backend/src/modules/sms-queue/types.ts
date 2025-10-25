/**
 * SMS Queue Types
 */

export interface QueuedMessage {
  id: string;
  to: string;
  body: string;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'sent' | 'failed';
  createdAt: Date;
  sentAt?: Date;
  attempts: number;
  maxAttempts: number;
  error?: string;
}

export interface QueueStats {
  pending: number;
  sent: number;
  failed: number;
  total: number;
}
