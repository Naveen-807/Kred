/**
 * SMS Queue Service
 * Manages outgoing SMS messages for Termux gateway to poll
 */

import { QueuedMessage, QueueStats } from './types.js';
import { logger } from '../../utils/logger.js';

class SMSQueueService {
  private queue: Map<string, QueuedMessage>;
  private messageIdCounter: number;

  constructor() {
    this.queue = new Map();
    this.messageIdCounter = 0;
  }

  /**
   * Add message to outgoing queue
   */
  addMessage(to: string, body: string, priority: 'high' | 'normal' | 'low' = 'normal'): string {
    const id = `msg_${Date.now()}_${++this.messageIdCounter}`;
    
    const message: QueuedMessage = {
      id,
      to,
      body,
      priority,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 3
    };

    this.queue.set(id, message);
    
    logger.info({ id, to, bodyLength: body.length, priority }, '📤 SMS queued for sending');
    
    return id;
  }

  /**
   * Get pending messages for Termux to send
   * Returns high priority first
   */
  getPendingMessages(limit: number = 10): QueuedMessage[] {
    const pending = Array.from(this.queue.values())
      .filter(msg => msg.status === 'pending')
      .sort((a, b) => {
        // Sort by priority (high > normal > low)
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        // Then by creation time (oldest first)
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, limit);

    return pending;
  }

  /**
   * Mark message as sent
   */
  markAsSent(messageId: string): boolean {
    const message = this.queue.get(messageId);
    
    if (!message) {
      logger.warn({ messageId }, 'Cannot mark unknown message as sent');
      return false;
    }

    message.status = 'sent';
    message.sentAt = new Date();
    
    logger.info({ messageId, to: message.to }, '✅ SMS marked as sent');
    
    // Clean up old sent messages after 5 minutes
    setTimeout(() => {
      this.queue.delete(messageId);
    }, 5 * 60 * 1000);

    return true;
  }

  /**
   * Mark message as failed
   */
  markAsFailed(messageId: string, error: string): boolean {
    const message = this.queue.get(messageId);
    
    if (!message) {
      logger.warn({ messageId }, 'Cannot mark unknown message as failed');
      return false;
    }

    message.attempts++;
    message.error = error;

    if (message.attempts >= message.maxAttempts) {
      message.status = 'failed';
      logger.error({ messageId, to: message.to, error, attempts: message.attempts }, '❌ SMS failed permanently');
      
      // Clean up failed messages after 1 hour
      setTimeout(() => {
        this.queue.delete(messageId);
      }, 60 * 60 * 1000);
    } else {
      logger.warn({ messageId, to: message.to, error, attempts: message.attempts }, '⚠️ SMS failed, will retry');
      // Keep status as pending for retry
    }

    return true;
  }

  /**
   * Get specific message by ID
   */
  getMessage(messageId: string): QueuedMessage | undefined {
    return this.queue.get(messageId);
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const messages = Array.from(this.queue.values());
    
    return {
      pending: messages.filter(m => m.status === 'pending').length,
      sent: messages.filter(m => m.status === 'sent').length,
      failed: messages.filter(m => m.status === 'failed').length,
      total: messages.length
    };
  }

  /**
   * Clear all messages (for testing)
   */
  clear(): void {
    this.queue.clear();
    this.messageIdCounter = 0;
    logger.info('SMS queue cleared');
  }

  /**
   * Get all messages (for debugging)
   */
  getAllMessages(): QueuedMessage[] {
    return Array.from(this.queue.values());
  }
}

// Singleton instance
export const smsQueue = new SMSQueueService();
