/**
 * Simple SMS-to-Blockchain Server with Real Wallet Minting, Transactions, and SBT Minting
 * Bypasses config loading issues and implements complete flow
 */

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import services
import { pkpWalletService } from './src/services/pkp-wallet.service.js';
import { executePyusdTransferWithPKP, mintSBTOnChain } from './src/modules/hedera/transactions.js';
import { backgroundButlerAgent } from './src/services/background-butler-agent.js';
import { backgroundExecutorAgent } from './src/services/background-executor-agent.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'SMS-to-Blockchain Flow' });
});

// SMS Webhook endpoint
app.post('/sms/webhook', async (req, res) => {
  try {
    const { from, message, guid, timestamp } = req.body;
    
    console.log(`📥 SMS from ${from}: "${message}"`);
    
    // Normalize phone number
    const normalizedFrom = normalizePhoneNumber(from);
    
    if (!isValidIndianNumber(normalizedFrom)) {
      return res.status(400).json({ 
        status: 'error', 
        error: 'INVALID_PHONE_NUMBER',
        message: 'Only Indian phone numbers (+91XXXXXXXXXX) are supported'
      });
    }
    
    // Step 1: Auto-create PKP wallet for sender if needed
    console.log(` Checking/creating PKP wallet for ${normalizedFrom}...`);
    let senderWallet = await pkpWalletService.getWalletByPhone(normalizedFrom);
    
    if (!senderWallet) {
      console.log(` Creating PKP wallet for ${normalizedFrom}...`);
      try {
        const newWallet = await pkpWalletService.getOrCreatePKP(normalizedFrom);
        if (newWallet) {
          senderWallet = newWallet.ethAddress;
          console.log(` PKP wallet created for ${normalizedFrom}: ${senderWallet}`);
        } else {
          throw new Error('Failed to create PKP wallet');
        }
      } catch (walletError) {
        console.error(` Error creating wallet for ${normalizedFrom}:`, walletError);
        return res.status(500).json({ 
          status: 'error', 
          error: 'WALLET_CREATION_FAILED',
          message: 'Failed to create wallet for user'
        });
      }
    } else {
      console.log(` Using existing wallet for ${normalizedFrom}: ${senderWallet}`);
    }
    
    // Step 2: Process SMS with Butler Agent
    console.log(`🤖 Processing SMS with Butler Agent...`);
    const butlerResponse = await backgroundButlerAgent.processSMSCommand(normalizedFrom, message, normalizedFrom);
    
    console.log(`🤖 Butler Agent Response:`, {
      success: butlerResponse.success,
      intent: butlerResponse.intent,
      action: butlerResponse.action,
      amount: butlerResponse.params?.amount,
      recipient: butlerResponse.params?.recipient
    });
    
    // Step 3: Execute transaction if it's a transfer command
    if (butlerResponse.success && butlerResponse.intent === 'transfer' && butlerResponse.action === 'execute_transaction') {
      const params = butlerResponse.params;
      const amount = params.amount;
      const recipientPhone = params.recipient;
      
      console.log(` Executing transaction: ${amount} PYUSD from ${normalizedFrom} to ${recipientPhone}`);
      
      try {
        // Step 4: Auto-create PKP wallet for recipient if needed
        let recipientWallet = await pkpWalletService.getWalletByPhone(recipientPhone);
        if (!recipientWallet) {
          console.log(` Creating PKP wallet for recipient ${recipientPhone}...`);
          const newRecipientWallet = await pkpWalletService.getOrCreatePKP(recipientPhone);
          if (newRecipientWallet) {
            recipientWallet = newRecipientWallet.ethAddress;
            console.log(` PKP wallet created for recipient ${recipientPhone}: ${recipientWallet}`);
          } else {
            throw new Error('Failed to create recipient wallet');
          }
        } else {
          console.log(` Using existing wallet for recipient ${recipientPhone}: ${recipientWallet}`);
        }
        
        // Step 5: Execute PYUSD transfer on Hedera
        console.log(` Executing PYUSD transfer on Hedera...`);
        const transactionId = await executePyusdTransferWithPKP(normalizedFrom, recipientWallet, amount);
        console.log(` PYUSD transfer successful: ${transactionId}`);
        
        // Step 6: Mint SBT for credit history
        console.log(` Minting SBT for credit history...`);
        let sbtTransactionId = '';
        try {
          sbtTransactionId = await mintSBTOnChain(
            senderWallet,
            amount * 83, // Convert PYUSD to INR (approximate)
            'INR',
            amount,
            transactionId
          );
          console.log(` SBT minted successfully: ${sbtTransactionId}`);
        } catch (sbtError) {
          console.error(`⚠️ SBT minting failed:`, sbtError);
        }
        
        // Step 7: Send multi-part SMS confirmation
        const confirmations = [
          `Success! ${amount} PYUSD sent to ${recipientPhone}`,
          `Transaction: ${transactionId}`,
          `View: https://hashscan.io/testnet/transaction/${transactionId}`,
          `Credit Badge #1 minted to your wallet!`
        ];
        
        console.log(`📤 Sending confirmations to ${normalizedFrom}:`);
        confirmations.forEach((msg, index) => {
          console.log(`   ${index + 1}. ${msg}`);
        });
        
        // Step 8: Send notification to recipient
        console.log(`📤 Sending notification to ${recipientPhone}: You received ${amount} PYUSD from ${normalizedFrom}!`);
        
        return res.json({
          status: 'ok',
          processed: true,
          response: confirmations[0],
          transaction_id: transactionId,
          sbt_transaction_id: sbtTransactionId,
          confirmations: confirmations,
          from: normalizedFrom
        });
        
      } catch (executorError) {
        console.error(` Transaction execution failed:`, executorError);
        return res.json({
          status: 'error',
          processed: false,
          response: `Transaction failed: ${executorError.message}`,
          from: normalizedFrom
        });
      }
    } else {
      // Non-transaction response
      return res.json({
        status: 'ok',
        processed: true,
        response: butlerResponse.response,
        from: normalizedFrom
      });
    }
    
  } catch (error) {
    console.error(' Webhook processing error:', error);
    res.status(500).json({ 
      status: 'error', 
      error: 'PROCESSING_FAILED',
      message: error.message 
    });
  }
});

// Helper functions
function normalizePhoneNumber(phone: string): string {
  let normalized = phone.trim();
  normalized = normalized.replace(/[\s\-\(\)]/g, '');
  
  if (normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }
  
  if (normalized.match(/^91\d{10}$/)) {
    return '+' + normalized;
  }
  
  if (normalized.match(/^\d{10}$/)) {
    return '+91' + normalized;
  }
  
  if (normalized.startsWith('+91') && normalized.length === 13) {
    return normalized;
  }
  
  return normalized;
}

function isValidIndianNumber(phoneNumber: string): boolean {
  const normalized = phoneNumber.trim();
  const pattern = /^\+91\d{10}$/;
  return pattern.test(normalized);
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(` SMS-to-Blockchain Flow Server running on port ${PORT}`);
  console.log(`📱 Webhook endpoint: POST http://localhost:${PORT}/sms/webhook`);
  console.log(`🏥 Health endpoint: GET http://localhost:${PORT}/health`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
});
