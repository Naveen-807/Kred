/**
 * Contextual Memory Agent
 * Manages personalized knowledge graphs and contact resolution
 * Provides context-aware responses and memory persistence
 */

import { logger } from '../utils/logger.js';
import { UserContextModel } from '../models/UserContext.js';

interface ContactInfo {
  name: string;
  phone: string;
  nickname?: string;
  lastTransaction?: Date;
}

interface UserPreferences {
  language: string;
  currency: string;
  riskTolerance: 'low' | 'medium' | 'high';
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
}

interface TransactionPattern {
  averageAmount: number;
  frequentRecipients: string[];
  typicalTimes: string[];
  monthlyVolume: number;
}

interface ConversationEntry {
  timestamp: Date;
  intent: string;
  response: string;
  satisfaction?: number;
}

export class ContextualMemoryAgent {
  private static instance: ContextualMemoryAgent;

  static getInstance(): ContextualMemoryAgent {
    if (!ContextualMemoryAgent.instance) {
      ContextualMemoryAgent.instance = new ContextualMemoryAgent();
    }
    return ContextualMemoryAgent.instance;
  }

  /**
   * Get or create user context
   */
  async getUserContext(phoneNumber: string): Promise<any> {
    try {
      let context = await UserContextModel.findOne({ phoneNumber });
      
      if (!context) {
        logger.info({ phoneNumber }, 'Creating new user context');
        context = await UserContextModel.create({
          phoneNumber,
          knowledgeGraph: {
            contacts: [],
            preferences: {
              language: 'en',
              currency: 'PYUSD',
              riskTolerance: 'medium',
              notificationFrequency: 'immediate'
            },
            transactionPatterns: {
              averageAmount: 0,
              frequentRecipients: [],
              typicalTimes: [],
              monthlyVolume: 0
            },
            conversationHistory: []
          }
        });
      }
      
      return context;
    } catch (error) {
      logger.error({ err: error, phoneNumber }, 'Error getting user context');
      return null;
    }
  }

  /**
   * Add contact to user's knowledge graph
   */
  async addContact(phoneNumber: string, contact: ContactInfo): Promise<boolean> {
    try {
      const result = await UserContextModel.updateOne(
        { phoneNumber },
        {
          $push: {
            'knowledgeGraph.contacts': contact
          }
        }
      );
      
      logger.info({ phoneNumber, contact }, 'Contact added to knowledge graph');
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error({ err: error, phoneNumber, contact }, 'Error adding contact');
      return false;
    }
  }

  /**
   * Resolve contact name to phone number
   */
  async resolveContact(phoneNumber: string, name: string): Promise<string | null> {
    try {
      const context = await this.getUserContext(phoneNumber);
      if (!context?.knowledgeGraph?.contacts) return null;
      
      const contact = context.knowledgeGraph.contacts.find((c: ContactInfo) => 
        c.name.toLowerCase() === name.toLowerCase() ||
        (c.nickname && c.nickname.toLowerCase() === name.toLowerCase())
      );
      
      if (contact) {
        logger.info({ phoneNumber, name, resolvedPhone: contact.phone }, 'Contact resolved');
        return contact.phone;
      }
      
      return null;
    } catch (error) {
      logger.error({ err: error, phoneNumber, name }, 'Error resolving contact');
      return null;
    }
  }

  /**
   * Update transaction patterns
   */
  async updateTransactionPatterns(phoneNumber: string, transaction: {
    amount: number;
    recipient: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      const context = await this.getUserContext(phoneNumber);
      if (!context) return;

      const patterns = context.knowledgeGraph.transactionPatterns;
      
      // Update average amount (rolling average)
      const newAverage = (patterns.averageAmount + transaction.amount) / 2;
      
      // Update frequent recipients
      const recipients = [...patterns.frequentRecipients];
      if (!recipients.includes(transaction.recipient)) {
        recipients.push(transaction.recipient);
      }
      
      // Update typical times
      const hour = transaction.timestamp.getHours().toString();
      const times = [...patterns.typicalTimes];
      if (!times.includes(hour)) {
        times.push(hour);
      }
      
      // Update monthly volume
      const currentMonth = new Date().getMonth();
      const transactionMonth = transaction.timestamp.getMonth();
      let monthlyVolume = patterns.monthlyVolume;
      
      if (currentMonth === transactionMonth) {
        monthlyVolume += transaction.amount;
      }

      await UserContextModel.updateOne(
        { phoneNumber },
        {
          $set: {
            'knowledgeGraph.transactionPatterns': {
              averageAmount: newAverage,
              frequentRecipients: recipients,
              typicalTimes: times,
              monthlyVolume: monthlyVolume
            }
          }
        }
      );
      
      logger.info({ phoneNumber, transaction }, 'Transaction patterns updated');
    } catch (error) {
      logger.error({ err: error, phoneNumber, transaction }, 'Error updating transaction patterns');
    }
  }

  /**
   * Log conversation entry
   */
  async logConversation(phoneNumber: string, intent: string, response: string, satisfaction?: number): Promise<void> {
    try {
      const conversationEntry: ConversationEntry = {
        timestamp: new Date(),
        intent,
        response,
        satisfaction
      };

      await UserContextModel.updateOne(
        { phoneNumber },
        {
          $push: {
            'knowledgeGraph.conversationHistory': conversationEntry
          }
        }
      );
      
      logger.info({ phoneNumber, intent }, 'Conversation logged');
    } catch (error) {
      logger.error({ err: error, phoneNumber, intent }, 'Error logging conversation');
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(phoneNumber: string, limit: number = 10): Promise<ConversationEntry[]> {
    try {
      const context = await this.getUserContext(phoneNumber);
      if (!context?.knowledgeGraph?.conversationHistory) return [];
      
      return context.knowledgeGraph.conversationHistory
        .slice(-limit)
        .reverse();
    } catch (error) {
      logger.error({ err: error, phoneNumber }, 'Error getting conversation history');
      return [];
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(phoneNumber: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      const result = await UserContextModel.updateOne(
        { phoneNumber },
        {
          $set: {
            'knowledgeGraph.preferences': preferences
          }
        }
      );
      
      logger.info({ phoneNumber, preferences }, 'User preferences updated');
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error({ err: error, phoneNumber, preferences }, 'Error updating preferences');
      return false;
    }
  }

  /**
   * Get personalized greeting based on context
   */
  async getPersonalizedGreeting(phoneNumber: string): Promise<string> {
    try {
      const context = await this.getUserContext(phoneNumber);
      if (!context) return 'Hello! How can I help you today?';
      
      const patterns = context.knowledgeGraph.transactionPatterns;
      const contacts = context.knowledgeGraph.contacts;
      
      let greeting = 'Hello! ';
      
      if (contacts.length > 0) {
        greeting += `I see you have ${contacts.length} contacts saved. `;
      }
      
      if (patterns.averageAmount > 0) {
        greeting += `Your typical transaction is ${patterns.averageAmount.toFixed(2)} PYUSD. `;
      }
      
      greeting += 'How can I help you today?';
      
      return greeting;
    } catch (error) {
      logger.error({ err: error, phoneNumber }, 'Error generating personalized greeting');
      return 'Hello! How can I help you today?';
    }
  }

  /**
   * Get contextual suggestions based on user patterns
   */
  async getContextualSuggestions(phoneNumber: string): Promise<string[]> {
    try {
      const context = await this.getUserContext(phoneNumber);
      if (!context) return [];
      
      const patterns = context.knowledgeGraph.transactionPatterns;
      const contacts = context.knowledgeGraph.contacts;
      const suggestions: string[] = [];
      
      // Suggest frequent recipients
      if (patterns.frequentRecipients.length > 0) {
        const frequentRecipient = patterns.frequentRecipients[0];
        const contact = contacts.find((c: ContactInfo) => c.phone === frequentRecipient);
        const name = contact ? contact.name : frequentRecipient;
        suggestions.push(`Send money to ${name}`);
      }
      
      // Suggest based on average amount
      if (patterns.averageAmount > 0) {
        suggestions.push(`Send ${patterns.averageAmount.toFixed(2)} PYUSD`);
      }
      
      // Suggest based on time patterns
      const currentHour = new Date().getHours();
      if (patterns.typicalTimes.includes(currentHour.toString())) {
        suggestions.push('Check your balance');
      }
      
      return suggestions;
    } catch (error) {
      logger.error({ err: error, phoneNumber }, 'Error getting contextual suggestions');
      return [];
    }
  }

  /**
   * Analyze user behavior for insights
   */
  async analyzeUserBehavior(phoneNumber: string): Promise<{
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
    activityLevel: 'low' | 'medium' | 'high';
    preferredTimes: string[];
    topRecipients: string[];
  }> {
    try {
      const context = await this.getUserContext(phoneNumber);
      if (!context) {
        return {
          riskProfile: 'moderate',
          activityLevel: 'low',
          preferredTimes: [],
          topRecipients: []
        };
      }
      
      const patterns = context.knowledgeGraph.transactionPatterns;
      const preferences = context.knowledgeGraph.preferences;
      
      // Determine risk profile
      let riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate';
      if (preferences.riskTolerance === 'low') riskProfile = 'conservative';
      else if (preferences.riskTolerance === 'high') riskProfile = 'aggressive';
      
      // Determine activity level
      let activityLevel: 'low' | 'medium' | 'high' = 'low';
      if (patterns.monthlyVolume > 1000) activityLevel = 'high';
      else if (patterns.monthlyVolume > 100) activityLevel = 'medium';
      
      return {
        riskProfile,
        activityLevel,
        preferredTimes: patterns.typicalTimes,
        topRecipients: patterns.frequentRecipients.slice(0, 3)
      };
    } catch (error) {
      logger.error({ err: error, phoneNumber }, 'Error analyzing user behavior');
      return {
        riskProfile: 'moderate',
        activityLevel: 'low',
        preferredTimes: [],
        topRecipients: []
      };
    }
  }
}

// Export singleton instance
export const contextualMemoryAgent = ContextualMemoryAgent.getInstance();
