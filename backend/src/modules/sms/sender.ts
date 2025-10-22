import { sendSmsWithRetry } from "../../services/twilioClient.js";
import { logger } from "../../utils/logger.js";

import { templates } from "./templates.js";

export async function sendLoanOfferSms(phone: string, amount: number) {
  try {
    const sid = await sendSmsWithRetry(phone, templates.loanOffer(amount));
    logger.info({ phone, sid }, "SMS sent successfully");
  } catch (error) {
    logger.error({ err: error, phone }, "Failed to send SMS after retries");
    // Don't throw - we don't want to break the flow if SMS fails
  }
}

export async function sendGenericSms(phone: string, message: string) {
  try {
    const sid = await sendSmsWithRetry(phone, message);
    logger.info({ phone, sid }, "SMS sent successfully");
  } catch (error) {
    logger.error({ err: error, phone }, "Failed to send SMS after retries");
    // Don't throw - we don't want to break the flow if SMS fails
  }
}
