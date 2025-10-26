/**
 * Simplified SMS Webhook Handler
 * User sends: "Send 20 PYUSD"
 * System: Generates OTP, mints wallet, sends single SMS
 */

import { Router, Request, Response } from 'express';
import { sendSMSToUser } from '../services/smsMobileApiClient';
import { logger } from '../utils/logger';
import { pkpWalletService } from '../services/pkp-wallet.service';

const router = Router();

interface SMSMobileAPIWebhook {
  from: string;
  message: string;
  guid: string;
  timestamp: string;
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

/**
 * Generate 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Parse amount from SMS message
 */
function parseAmount(message: string): number | null {
  const match = message.match(/(?:send|pay|transfer)\s+(\d+(?:\.\d+)?)\s*(?:pyusd|inr|usd)?/i);
  return match ? parseFloat(match[1]) : null;
}

/**
 * SMS Webhook Handler
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { from, message, guid, timestamp }: SMSMobileAPIWebhook = req.body;
    const normalizedFrom = normalizePhoneNumber(from);
    
    logger.info({ from: normalizedFrom, message }, 'SMS received');
    
    // Validate phone number
    if (!isValidIndianNumber(normalizedFrom)) {
      return res.status(400).json({ 
        status: 'error', 
        error: 'INVALID_PHONE_NUMBER',
        message: 'Only Indian phone numbers (+91XXXXXXXXXX) are supported'
      });
    }
    
    // Parse amount from message
    const amount = parseAmount(message);
    if (!amount) {
      return res.json({
        status: 'ok',
        processed: true,
        response: 'Please send: "Send [amount] PYUSD" (e.g., "Send 20 PYUSD")',
        from: normalizedFrom
      });
    }
    
    // Step 1: Generate OTP
    const otp = generateOTP();
    logger.info({ phone: normalizedFrom, otp }, 'OTP generated');
    
    // Step 2: Check/Create PKP Wallet
    let walletAddress = await pkpWalletService.getWalletByPhone(normalizedFrom);
    
    if (!walletAddress) {
      logger.info({ phone: normalizedFrom }, 'Creating PKP wallet');
      try {
        const newWallet = await pkpWalletService.getOrCreatePKP(normalizedFrom);
        if (newWallet) {
          walletAddress = newWallet.ethAddress;
          logger.info({ phone: normalizedFrom, wallet: walletAddress }, 'PKP wallet created');
        } else {
          throw new Error('Failed to create PKP wallet');
        }
      } catch (walletError) {
        logger.error({ err: walletError, phone: normalizedFrom }, 'PKP wallet creation failed');
        return res.status(500).json({ 
          status: 'error', 
          error: 'WALLET_CREATION_FAILED',
          message: 'Failed to create wallet'
        });
      }
    } else {
      logger.info({ phone: normalizedFrom, wallet: walletAddress }, 'Using existing wallet');
    }
    
    // Step 3: Send SINGLE SMS with OTP and Wallet Info
    const singleSMS = `Your wallet is ready! Address: ${walletAddress}. OTP: ${otp}. Use this OTP to complete your ${amount} PYUSD transaction.`;
    
    logger.info({ phone: normalizedFrom, sms: singleSMS }, 'Sending single SMS');
    
    // Send SMS (this would be the actual SMS sending)
    console.log(`📱 SMS to ${normalizedFrom}: "${singleSMS}"`);
    
    return res.json({
      status: 'ok',
      processed: true,
      response: singleSMS,
      otp: otp,
      wallet: walletAddress,
      amount: amount,
      from: normalizedFrom
    });
    
  } catch (error) {
    logger.error({ err: error }, 'SMS webhook processing error');
    res.status(500).json({ 
      status: 'error', 
      error: 'PROCESSING_FAILED',
      message: error.message 
    });
  }
});

export default router;
