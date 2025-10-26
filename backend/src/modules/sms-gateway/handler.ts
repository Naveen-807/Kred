/**
 * SMS Gateway Handler
 * Processes SMS from React Native gateway app
 */

import { parseCommand } from "../commands/parser.js";
import { executeCommand } from "../commands/commandExecutor.js";
import { smsQueue } from "../sms-queue/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Handle SMS received from gateway app
 */
export async function handleSMSFromGateway(
  phoneNumber: string,
  messageBody: string,
  gatewayId: string
): Promise<{ response: string; data?: any }> {
  
  logger.info({ phoneNumber, messageBody, gatewayId }, "Processing SMS from gateway");

  try {
    // Parse SMS command
    const command = await parseCommand(messageBody);

    if (!command) {
      return {
        response: "Invalid command. Send HELP for available commands.",
        data: { error: "Invalid command" }
      };
    }

    logger.info({ phoneNumber, command: command.type }, "Command parsed successfully");

    // Execute command (may return void or result object)
    const result: any = await executeCommand(phoneNumber, command);

    // Determine response message
    const responseMessage = result?.message || generateResponseSMS(result) || "Command executed successfully";

    // Queue response SMS (instead of returning it directly)
    const messageId = smsQueue.addMessage(phoneNumber, responseMessage, 'high');

    // Return success to gateway (NOT the SMS response)
    return {
      response: `Message queued successfully`,
      data: {
        messageId,
        queued: true,
        result
      }
    };

  } catch (error: any) {
    logger.error({ err: error, phoneNumber }, "Error processing SMS from gateway");

    return {
      response: `Error: ${error.message}`,
      data: { error: error.message }
    };
  }
}

/**
 * Generate response SMS based on command result
 */
function generateResponseSMS(result: any): string {
  // Override based on result type
  if (result.walletCreated) {
    return ` Wallet created! Address: ${result.walletAddress.substring(0, 10)}... Set your PIN to start.`;
  }

  if (result.otpSent) {
    return `🔐 OTP: ${result.otp}. Reply with your PIN to confirm.`;
  }

  if (result.paymentSuccess) {
    return ` Payment of ${result.amount} sent! TX: ${result.txHash.substring(0, 20)}...`;
  }

  return result.message || "Command processed";
}
