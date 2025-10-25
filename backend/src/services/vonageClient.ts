import axios from 'axios';
import { logger } from '../utils/logger.js';

// Vonage API configuration
const VONAGE_API_KEY = process.env.VONAGE_API_KEY;
const VONAGE_API_SECRET = process.env.VONAGE_API_SECRET;
const VONAGE_FROM = process.env.VONAGE_FROM || 'OfflinePay';

// Rate limiting to prevent excessive usage (limited credits!)
const DAILY_SMS_LIMIT = 20; // Conservative limit
const smsCountToday = new Map<string, { count: number; date: string }>();

function checkRateLimit(to: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  const record = smsCountToday.get(to);
  
  if (!record || record.date !== today) {
    smsCountToday.set(to, { count: 1, date: today });
    return true;
  }
  
  if (record.count >= DAILY_SMS_LIMIT) {
    logger.warn({ to, count: record.count }, '⚠️ Vonage daily SMS limit reached for this number');
    return false;
  }
  
  record.count++;
  return true;
}

export async function sendSmsViaVonage(to: string, message: string): Promise<string> {
  // Check rate limit first
  if (!checkRateLimit(to)) {
    throw new Error(`Daily SMS limit (${DAILY_SMS_LIMIT}) reached for ${to}. Vonage has limited credits.`);
  }
  try {
    if (!VONAGE_API_KEY || !VONAGE_API_SECRET) {
      throw new Error('Vonage API credentials not configured');
    }

    logger.info({ to, messageLength: message.length }, 'Sending SMS via Vonage');

    // Vonage SMS API endpoint
    const url = 'https://rest.nexmo.com/sms/json';

    const response = await axios.post(url, {
      api_key: VONAGE_API_KEY,
      api_secret: VONAGE_API_SECRET,
      to: to.replace('+', ''), // Remove + prefix
      from: VONAGE_FROM,
      text: message,
      type: 'unicode' // Support international characters
    });

    // Check if message was sent successfully
    if (response.data.messages && response.data.messages[0]) {
      const msg = response.data.messages[0];
      
      if (msg.status === '0') {
        logger.info({ 
          to, 
          messageId: msg['message-id'],
          remainingBalance: response.data.messages[0]['remaining-balance']
        }, 'SMS sent successfully via Vonage');
        return msg['message-id'];
      } else {
        throw new Error(`Vonage error: ${msg['error-text'] || 'Unknown error'}`);
      }
    } else {
      throw new Error('Vonage API returned unexpected response');
    }
  } catch (error: any) {
    logger.error({ err: error, to }, 'Failed to send SMS via Vonage');
    throw error;
  }
}
