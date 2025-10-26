/**
 * Background Butler Agent
 * Processes SMS commands and extracts transaction parameters
 * Works as a background service within the backend
 */

import { logger } from '../utils/logger.js';

interface ButlerResponse {
  success: boolean;
  intent: string;
  action: string;
  response: string;
  params?: {
    amount: number;
    recipient: string;
    currency: string;
    from_user: string;
    transaction_type: string;
    sender_phone: string;
  };
  risk_score?: number;
  confidence?: number;
}

export class BackgroundButlerAgent {
  private static instance: BackgroundButlerAgent;

  static getInstance(): BackgroundButlerAgent {
    if (!BackgroundButlerAgent.instance) {
      BackgroundButlerAgent.instance = new BackgroundButlerAgent();
    }
    return BackgroundButlerAgent.instance;
  }

  /**
   * Process SMS command and extract transaction parameters
   */
  async processSMSCommand(phone: string, message: string, user_id: string): Promise<ButlerResponse> {
    try {
      logger.info({ phone, message, user_id }, 'Processing SMS command with Butler Agent');

      // Extract intent from message
      const intent = this.extractIntent(message);
      
      switch (intent) {
        case 'transfer':
          return this.handleTransferCommand(phone, message, user_id);
        case 'balance':
          return this.handleBalanceCommand(phone, message, user_id);
        case 'help':
          return this.handleHelpCommand(phone, message, user_id);
        default:
          return this.handleUnknownCommand(phone, message, user_id);
      }
    } catch (error) {
      logger.error({ err: error, phone, message }, 'Error processing SMS command');
      return {
        success: false,
        intent: 'error',
        action: 'error',
        response: 'Sorry, I encountered an error. Please try again or send HELP for available commands.',
        error: error.message
      };
    }
  }

  private extractIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('send') || lowerMessage.includes('pay') || lowerMessage.includes('transfer')) {
      return 'transfer';
    } else if (lowerMessage.includes('balance') || lowerMessage.includes('check')) {
      return 'balance';
    } else if (lowerMessage.includes('help') || lowerMessage.includes('commands')) {
      return 'help';
    }
    
    return 'unknown';
  }

  private handleTransferCommand(phone: string, message: string, user_id: string): ButlerResponse {
    logger.info({ phone, message }, 'Processing transfer command');

    // Extract amount and recipient phone number using regex
    let amount: number | null = null;
    let recipientPhone: string | null = null;

    // Pattern to find phone numbers in +91XXXXXXXXXX format
    const phonePattern = /\+91\d{10}/g;
    const phoneMatches = message.match(phonePattern) || [];

    // Pattern to find amounts (numbers followed by optional currency)
    const amountPattern = /(\d+(?:\.\d+)?)\s*(?:PYUSD|INR|USD)?/i;
    const amountMatch = message.match(amountPattern);

    // Extract recipient phone (should be different from sender)
    for (const phoneMatch of phoneMatches) {
      if (phoneMatch !== phone) { // Not the sender's phone
        recipientPhone = phoneMatch;
        break;
      }
    }

    // Extract amount (take the first number found)
    if (amountMatch) {
      try {
        amount = parseFloat(amountMatch[1]);
      } catch (error) {
        amount = null;
      }
    }

    logger.info({ amount, recipientPhone }, 'Extracted transaction parameters');

    if (!amount || !recipientPhone) {
      return {
        success: false,
        intent: 'transfer',
        action: 'clarify',
        response: 'Please specify amount and recipient phone number. Example: Send 20 PYUSD to +919876543210',
        params: {
          amount: amount || 0,
          recipient: recipientPhone || '',
          currency: 'PYUSD',
          from_user: user_id,
          transaction_type: 'transfer',
          sender_phone: phone
        }
      };
    }

    // Validate amount
    if (amount <= 0 || amount > 10000) { // Reasonable limits
      return {
        success: false,
        intent: 'transfer',
        action: 'clarify',
        response: 'Amount must be between 1 and 10,000 PYUSD. Please try again.',
        params: {
          amount,
          recipient: recipientPhone,
          currency: 'PYUSD',
          from_user: user_id,
          transaction_type: 'transfer',
          sender_phone: phone
        }
      };
    }

    // Process transaction
    return {
      success: true,
      intent: 'transfer',
      action: 'execute_transaction',
      response: `Processing payment of ${amount} PYUSD to ${recipientPhone}...`,
      params: {
        amount,
        recipient: recipientPhone,
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'transfer',
        sender_phone: phone
      },
      risk_score: 2,
      confidence: 0.9
    };
  }

  private handleBalanceCommand(phone: string, message: string, user_id: string): ButlerResponse {
    return {
      success: true,
      intent: 'balance',
      action: 'check_balance',
      response: 'Checking your balance...',
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'balance',
        sender_phone: phone
      }
    };
  }

  private handleHelpCommand(phone: string, message: string, user_id: string): ButlerResponse {
    return {
      success: true,
      intent: 'help',
      action: 'show_help',
      response: 'Available commands:\n• Send <amount> PYUSD to <phone>\n• Balance\n• Help',
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'help',
        sender_phone: phone
      }
    };
  }

  private handleUnknownCommand(phone: string, message: string, user_id: string): ButlerResponse {
    return {
      success: false,
      intent: 'unknown',
      action: 'clarify',
      response: 'Unknown command. Send HELP for available commands.',
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'unknown',
        sender_phone: phone
      }
    };
  }
}

// Export singleton instance
export const backgroundButlerAgent = BackgroundButlerAgent.getInstance();
