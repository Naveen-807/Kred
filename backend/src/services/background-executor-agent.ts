/**
 * Background Executor Agent
 * Executes transactions on Hedera blockchain
 * Works as a background service within the backend
 */

import { logger } from '../utils/logger.js';
import { pkpWalletService } from './pk-wallet.service.js';
import { executePyusdTransferWithPKP, mintSBTOnChain } from '../modules/hedera/transactions.js';

interface ExecutorRequest {
  sender_phone: string;
  recipient: string;
  amount: number;
  currency: string;
  transaction_type: string;
}

interface ExecutorResponse {
  success: boolean;
  transaction_id?: string;
  sbt_transaction_id?: string;
  timestamp?: string;
  error_message?: string;
}

export class BackgroundExecutorAgent {
  private static instance: BackgroundExecutorAgent;

  static getInstance(): BackgroundExecutorAgent {
    if (!BackgroundExecutorAgent.instance) {
      BackgroundExecutorAgent.instance = new BackgroundExecutorAgent();
    }
    return BackgroundExecutorAgent.instance;
  }

  /**
   * Execute transaction on Hedera blockchain
   */
  async executeTransaction(request: ExecutorRequest): Promise<ExecutorResponse> {
    try {
      logger.info({ request }, 'Executing transaction with Executor Agent');

      const { sender_phone, recipient, amount, currency } = request;

      // Get sender's PKP wallet
      const senderWallet = await pkpWalletService.getWalletByPhone(sender_phone);
      if (!senderWallet) {
        throw new Error(`PKP wallet not found for sender: ${sender_phone}`);
      }

      // Get or create recipient's PKP wallet
      let recipientWallet = await pkpWalletService.getWalletByPhone(recipient);
      if (!recipientWallet) {
        logger.info({ recipient }, 'Creating wallet for recipient');
        const newRecipientWallet = await pkpWalletService.getOrCreatePKP(recipient);
        if (!newRecipientWallet) {
          throw new Error('Failed to create recipient wallet');
        }
        recipientWallet = newRecipientWallet.ethAddress;
      }

      // Execute PYUSD transfer with PKP signing
      const transactionId = await executePyusdTransferWithPKP(sender_phone, recipientWallet, amount);

      logger.info({ 
        transactionId, 
        sender_phone, 
        recipient, 
        amount 
      }, 'PYUSD transfer executed successfully');

      // Mint SBT for credit history
      let sbtTransactionId = '';
      try {
        sbtTransactionId = await mintSBTOnChain(
          senderWallet,
          amount * 83, // Convert PYUSD to INR (approximate)
          'INR',
          amount,
          transactionId
        );

        logger.info({ sbtTransactionId }, 'SBT minted successfully');
      } catch (sbtError) {
        logger.error({ err: sbtError }, 'SBT minting failed, but transaction succeeded');
      }

      return {
        success: true,
        transaction_id: transactionId,
        sbt_transaction_id: sbtTransactionId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error({ err: error, request }, 'Transaction execution failed');
      return {
        success: false,
        error_message: `Transaction execution failed: ${error.message}`
      };
    }
  }

  /**
   * Check agent health
   */
  async checkHealth(): Promise<{ status: string; service: string; timestamp: number }> {
    return {
      status: 'healthy',
      service: 'Background Executor Agent',
      timestamp: Date.now()
    };
  }
}

// Export singleton instance
export const backgroundExecutorAgent = BackgroundExecutorAgent.getInstance();
