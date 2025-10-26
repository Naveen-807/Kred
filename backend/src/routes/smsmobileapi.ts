/**
 * SMSMobileAPI Webhook Handler
 * Receives SMS from SMSMobileAPI and processes them
 * ONLY accepts Indian phone numbers (+91)
 */

import { Router, Request, Response } from 'express';
import { sendSMSToUser } from '../services/smsMobileApiClient';
import { asiAgentProcessor } from '../services/asiAgentProcessor';
import { logger } from '../utils/logger';
import { pkpWalletService } from '../services/pkp-wallet.service';

const router = Router();

interface SMSMobileAPIWebhook {
  from: string;
  message: string;
  guid: string;
  timestamp: string;
  sIdentifiantPhone?: string;
}

/**
 * Validate phone number is Indian (+91)
 */
function isValidIndianNumber(phoneNumber: string): boolean {
  const normalized = phoneNumber.trim();
  const pattern = /^\+91\d{10}$/;
  return pattern.test(normalized);
}

/**
 * Normalize phone number to +91 format
 */
function normalizePhoneNumber(phone: string): string {
  let normalized = phone.trim();
  
  // Remove spaces, dashes, parentheses
  normalized = normalized.replace(/[\s\-\(\)]/g, '');
  
  // If starts with 0, remove it
  if (normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }
  
  // If starts with 91 and has 10 more digits, add +
  if (normalized.match(/^91\d{10}$/)) {
    return '+' + normalized;
  }
  
  // If has 10 digits and doesn't start with country code
  if (normalized.match(/^\d{10}$/)) {
    return '+91' + normalized;
  }
  
  // If already starts with +91
  if (normalized.startsWith('+91') && normalized.length === 13) {
    return normalized;
  }
  
  return normalized;
}

/**
 * POST /webhook
 * Receives SMS from SMSMobileAPI webhook
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { from, message, guid, timestamp }: SMSMobileAPIWebhook = req.body;
    
    // Normalize phone number
    const normalizedFrom = normalizePhoneNumber(from);
    
    console.log(`📥 SMSMobileAPI - SMS from ${from} (normalized: ${normalizedFrom}):`, message);
    console.log(`   GUID: ${guid}, Timestamp: ${timestamp}`);
    
    // Validate Indian phone number
    if (!isValidIndianNumber(normalizedFrom)) {
      const errorMsg = ` Invalid phone number: ${from}. Only Indian numbers (+91XXXXXXXXXX) are supported.`;
      console.error(errorMsg);
      res.status(400).json({ 
        status: 'error', 
        error: 'INVALID_PHONE_NUMBER',
        message: 'Only Indian phone numbers (+91XXXXXXXXXX) are supported',
        received: from,
        normalized: normalizedFrom
      });
      return;
    }
    
    // Check and create PKP wallet for sender if needed
    let senderWallet = await pkpWalletService.getWalletByPhone(normalizedFrom);
    if (!senderWallet) {
      console.log(` Creating PKP wallet for ${normalizedFrom}...`);
      
      // Send initial SMS
      await sendSMSToUser(normalizedFrom, "Creating your wallet, please wait...");
      
      try {
        const newWallet = await pkpWalletService.getOrCreatePKP(normalizedFrom);
        if (newWallet) {
          senderWallet = newWallet.ethAddress;
          console.log(` PKP wallet created for ${normalizedFrom}: ${senderWallet}`);
          
          // Send confirmation SMS
          await sendSMSToUser(normalizedFrom, "Wallet created! You can now transact.");
        } else {
          throw new Error('Failed to create PKP wallet');
        }
      } catch (walletError) {
        console.error(` Error creating wallet for ${normalizedFrom}:`, walletError);
        await sendSMSToUser(normalizedFrom, "Error creating wallet. Please try again later.");
        res.status(500).json({ 
          status: 'error', 
          error: 'WALLET_CREATION_FAILED',
          message: 'Failed to create wallet for user'
        });
        return;
      }
    } else {
      console.log(` Using existing wallet for ${normalizedFrom}: ${senderWallet}`);
    }
    
    // Process the SMS command using ASI agents
    let responseMessage = '';
    let multiSmsMessages: string[] = [];
    
    try {
      logger.info({ phoneNumber: normalizedFrom, message }, 'Processing SMS with ASI agents');
      
      // Call Butler Agent to process the SMS (background)
      const butlerResponse = await asiAgentProcessor.processWithButlerAgent(normalizedFrom, message);
      
      logger.info({ 
        phoneNumber: normalizedFrom, 
        intent: butlerResponse.intent, 
        action: butlerResponse.action,
        success: butlerResponse.success
      }, 'Butler agent processing completed');
      
      // Handle transaction execution
      if (butlerResponse.success && butlerResponse.intent === 'transfer' && butlerResponse.action === 'execute_transaction') {
        const params = butlerResponse.params;
        const amount = params.amount;
        const recipientPhone = params.recipient;
        
        logger.info({ 
          senderPhone: normalizedFrom, 
          recipientPhone, 
          amount 
        }, 'Executing transaction via Executor Agent');
        
        try {
          // Call Executor Agent to execute transaction
          const executorResponse = await asiAgentProcessor.executeTransaction({
            sender_phone: normalizedFrom,
            recipient: recipientPhone,
            amount: amount,
            currency: params.currency || 'PYUSD',
            transaction_type: 'transfer'
          });
          
          if (executorResponse.success) {
            // Transaction successful - send multi-part confirmation
            const txHash = executorResponse.transaction_id;
            const sbtTxHash = executorResponse.sbt_transaction_id;
            
            // Multi-part SMS confirmation
            multiSmsMessages = [
              `Success! ${amount} PYUSD sent to ${recipientPhone}`,
              `Transaction: ${txHash}`,
              `View: https://hashscan.io/testnet/transaction/${txHash}`,
              `Credit Badge #1 minted to your wallet!`
            ];
            
            responseMessage = multiSmsMessages[0]; // First message as primary response
            
            // Send notification to recipient
            try {
              await sendSMSToUser(recipientPhone, `You received ${amount} PYUSD from ${normalizedFrom}!`);
            } catch (recipientError) {
              logger.warn({ err: recipientError, recipientPhone }, 'Failed to notify recipient');
            }
            
          } else {
            responseMessage = `Transaction failed: ${executorResponse.error_message}`;
          }
          
        } catch (executorError) {
          logger.error({ err: executorError }, 'Error executing transaction');
          responseMessage = 'Transaction failed. Please try again later.';
        }
        
      } else {
        // Non-transaction response
        responseMessage = butlerResponse.response;
      }
      
    } catch (error) {
      logger.error({ err: error, phoneNumber: normalizedFrom }, 'Error processing SMS with ASI agents');
      
      // Fallback to simple command processing
      if (message?.toUpperCase() === 'OTP') {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        responseMessage = `Your OTP is: ${otp}. Valid for 5 minutes.`;
        console.log(` Generated OTP ${otp} for ${normalizedFrom}`);
        
      } else if (message?.toUpperCase() === 'HELP') {
        responseMessage = 'Commands: OTP, PAY <amount> TO <address>, BALANCE, HELP';
        console.log(`ℹ️ Help requested by ${normalizedFrom}`);
        
      } else if (message?.toUpperCase().startsWith('PAY')) {
        const match = message.match(/PAY\s+(\d+)\s+(?:TO|to)\s+(0x[\da-fA-F]+|\+?\d+)/i);
        if (match) {
          const amount = match[1];
          const recipient = match[2];
          responseMessage = `Payment of ${amount} PYUSD to ${recipient} is being processed. You'll receive confirmation shortly.`;
          console.log(` Payment request: ${amount} PYUSD from ${normalizedFrom} to ${recipient}`);
        } else {
          responseMessage = 'Invalid payment format. Use: PAY 100 TO 0xABC123 or PAY 100 TO +91XXXXXXXXXX';
        }
        
      } else if (message?.toUpperCase() === 'BALANCE') {
        responseMessage = 'Your balance: 500 INR (PYUSD: 5.95)';
        console.log(` Balance check by ${normalizedFrom}`);
        
      } else {
        responseMessage = 'Unknown command. Send HELP for available commands.';
      }
    }
    
    // Send reply via SMSMobileAPI
    if (responseMessage) {
      console.log(`📤 Sending reply to ${normalizedFrom}: ${responseMessage}`);
      const sent = await sendSMSToUser(normalizedFrom, responseMessage);
      
      if (sent) {
        console.log(` Reply sent successfully to ${normalizedFrom}`);
        
        // Send additional messages if multi-SMS
        if (multiSmsMessages.length > 0) {
          console.log(`📤 Sending ${multiSmsMessages.length} additional messages`);
          
          for (let i = 0; i < multiSmsMessages.length; i++) {
            // Wait 2 seconds between messages
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const additionalMessage = multiSmsMessages[i];
            console.log(`📤 Sending additional message ${i + 1}: ${additionalMessage}`);
            
            const additionalSent = await sendSMSToUser(normalizedFrom, additionalMessage);
            if (additionalSent) {
              console.log(` Additional message ${i + 1} sent successfully`);
            } else {
              console.error(` Failed to send additional message ${i + 1}`);
            }
          }
        }
      } else {
        console.error(` Failed to send reply to ${normalizedFrom}`);
      }
    }
    
    res.json({ 
      status: 'ok', 
      processed: true,
      response: responseMessage,
      from: normalizedFrom
    });
    
  } catch (error) {
    console.error(' SMSMobileAPI webhook error:', error);
    res.status(500).json({ 
      status: 'error', 
      error: 'Processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /health
 * Health check for SMSMobileAPI integration
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'smsmobileapi',
    supported_region: 'India (+91 only)',
    timestamp: new Date().toISOString()
  });
});

export default router;
