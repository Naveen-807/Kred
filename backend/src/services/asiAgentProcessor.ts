/**
 * ASI Agent Processor Service
 * Bridges backend with background agents (no HTTP servers needed)
 */

import { logger } from '../utils/logger.js';
import { backgroundButlerAgent } from './background-butler-agent.js';
import { backgroundExecutorAgent } from './background-executor-agent.js';

// Types for ASI Agent communication
export interface SMSCommand {
  phone: string;
  message: string;
  user_id: string;
  timestamp: string;
}

export interface AgentResponse {
  intent: string;
  action: string;
  params: Record<string, any>;
  response: string;
  risk_score: number;
  confidence: number;
  requires_confirmation?: boolean;
  multi_sms?: boolean;
  next_steps?: string[];
}

export interface ExecuteTransactionRequest {
  from_user: string;
  to_user: string;
  amount: number;
  currency: string;
  transaction_type: string;
  user_id: string;
}

export interface ExecuteTransactionResponse {
  success: boolean;
  transaction_id?: string;
  hedera_account_from?: string;
  hedera_account_to?: string;
  sbt_minted?: boolean;
  confirmation_messages?: string[];
  error_message?: string;
}

class ASIAgentProcessor {
  constructor() {
    // No URLs needed for background agents
  }

  /**
   * Main entry point - Process SMS command with background agents
   */
  async processWithASIAgents(phoneNumber: string, message: string): Promise<AgentResponse> {
    try {
      logger.info({ phoneNumber, message }, 'Processing SMS with background agents');

      // Call Butler Agent directly
      const response = await backgroundButlerAgent.processSMSCommand(phoneNumber, message, phoneNumber);
      
      logger.info({ 
        phoneNumber, 
        intent: response.intent, 
        action: response.action,
        success: response.success 
      }, 'Background agent processing completed');

      return {
        intent: response.intent,
        action: response.action,
        params: response.params || {},
        response: response.response,
        risk_score: response.risk_score || 2,
        confidence: response.confidence || 0.8
      };

    } catch (error) {
      logger.error({ err: error, phoneNumber }, 'Error processing SMS with background agents');
      
      // Return fallback response
      return {
        intent: 'help',
        action: 'provide_help',
        params: {},
        response: 'Sorry, I encountered an error processing your request. Please try again or send HELP for available commands.',
        risk_score: 5,
        confidence: 0.0
      };
    }
  }

  /**
   * Process SMS with Butler Agent (background)
   */
  async processWithButlerAgent(phone: string, message: string): Promise<any> {
    try {
      logger.info({ phone, message }, 'Processing SMS with Butler Agent (background)');
      
      const response = await backgroundButlerAgent.processSMSCommand(phone, message, phone);
      
      logger.info({ 
        phone, 
        intent: response.intent, 
        action: response.action,
        success: response.success 
      }, 'Butler Agent processing completed');
      
      return response;
    } catch (error: any) {
      logger.error({ err: error, phone, message }, 'Failed to process SMS with Butler Agent');
      throw new Error(`Butler Agent processing failed: ${error.message}`);
    }
  }

  /**
   * Execute transaction with Executor Agent (background)
   */
  async executeTransaction(request: any): Promise<any> {
    try {
      logger.info({ request }, 'Executing transaction with Executor Agent (background)');
      
      const response = await backgroundExecutorAgent.executeTransaction(request);
      
      logger.info({ 
        success: response.success,
        transaction_id: response.transaction_id,
        sbt_transaction_id: response.sbt_transaction_id
      }, 'Executor Agent processing completed');
      
      return response;
    } catch (error: any) {
      logger.error({ err: error, request }, 'Failed to execute transaction');
      return {
        success: false,
        error_message: `Transaction execution failed: ${error.message}`
      };
    }
  }

  /**
   * Check health of all background agents
   */
  async checkAgentHealth(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    try {
      // Check Butler Agent
      const butlerHealth = await backgroundButlerAgent.processSMSCommand('+919999999999', 'help', 'test');
      results['butler-agent'] = butlerHealth.success;
    } catch (error: any) {
      logger.warn({ agent: 'butler-agent', error: error.message }, 'Butler agent health check failed');
      results['butler-agent'] = false;
    }
    
    try {
      // Check Executor Agent
      const executorHealth = await backgroundExecutorAgent.checkHealth();
      results['executor-agent'] = executorHealth.status === 'healthy';
    } catch (error: any) {
      logger.warn({ agent: 'executor-agent', error: error.message }, 'Executor agent health check failed');
      results['executor-agent'] = false;
    }
    
    return results;
  }
}

// Export singleton instance
export const asiAgentProcessor = new ASIAgentProcessor();