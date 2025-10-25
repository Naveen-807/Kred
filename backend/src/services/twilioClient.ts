import twilio from 'twilio';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    const accountSid = config.twilio?.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config.twilio?.authToken || process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    twilioClient = twilio(accountSid, authToken);
    logger.info('Twilio client initialized');
  }

  return twilioClient;
}

export async function sendSms(to: string, message: string): Promise<string> {
  try {
    const client = getTwilioClient();
    const fromNumber = config.twilio?.phoneNumber || process.env.TWILIO_PHONE_NUMBER;

    if (!fromNumber) {
      throw new Error('Twilio phone number not configured');
    }

    logger.info({ to, messageLength: message.length }, 'Sending SMS via Twilio');

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to
    });

    logger.info({ to, sid: result.sid, status: result.status }, 'SMS sent successfully');
    return result.sid;
  } catch (error) {
    logger.error({ err: error, to }, 'Failed to send SMS via Twilio');
    throw error;
  }
}

export async function sendSmsWithRetry(
  to: string,
  message: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendSms(to, message);
    } catch (error) {
      lastError = error as Error;
      logger.warn(
        { attempt, maxRetries, error: lastError.message },
        'SMS send attempt failed, retrying...'
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  // If Twilio fails after all retries, try Vonage as fallback
  logger.info({ to }, '📱 Twilio failed, trying Vonage as fallback...');
  try {
    const { sendSmsViaVonage } = await import('./vonageClient.js');
    const result = await sendSmsViaVonage(to, message);
    logger.info({ to, result }, '✅ SMS sent successfully via Vonage fallback');
    return result;
  } catch (vonageError) {
    logger.error({ err: vonageError, to }, '❌ Vonage fallback also failed');
    throw lastError || new Error('Failed to send SMS via both Twilio and Vonage');
  }
}
