import { logger } from "../../utils/logger.js";
import { templates } from "./templates.js";
import { queueSms } from "../sms-queue/index.js";

/**
 * SMS Sender - Now uses SMS Gateway Queue
 * Messages are queued and sent via Termux SMS Gateway
 * No more Twilio/Vonage dependencies!
 */

export async function sendLoanOfferSms(phone: string, amount: number) {
  try {
    const messageId = await queueSms({
      to: phone,
      message: templates.loanOffer(amount),
      priority: 'normal'
    });
    logger.info({ phone, messageId }, "SMS queued successfully");
  } catch (error) {
    logger.error({ err: error, phone }, "Failed to queue SMS");
    // Don't throw - we don't want to break the flow if SMS fails
  }
}

export async function sendGenericSms(phone: string, message: string) {
  try {
    const messageId = await queueSms({
      to: phone,
      message: message,
      priority: 'high' // High priority for important messages
    });
    logger.info({ phone, messageId }, "SMS queued successfully");
  } catch (error) {
    logger.error({ err: error, phone }, "Failed to queue SMS");
    // Don't throw - we don't want to break the flow if SMS fails
  }
}
