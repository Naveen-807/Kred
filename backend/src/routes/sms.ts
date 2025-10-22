import express from "express";

import { parseCommand } from "../modules/commands/parser.js";
import { executeCommand } from "../modules/commands/commandExecutor.js";
import { templates } from "../modules/sms/templates.js";
import { sendSms } from "../services/msg91Client.js";
import { logger } from "../utils/logger.js";

export const smsRouter = express.Router();

// Store last messages for UI display
const messageStore = new Map<string, { message: string; timestamp: number; otp?: string; nextStep?: string }>();

// Helper to store message for UI
export function storeUIMessage(phone: string, message: string, otp?: string, nextStep?: string) {
  messageStore.set(phone, { message, timestamp: Date.now(), otp, nextStep });
}

// Get stored message for UI
smsRouter.get("/last-message/:phone", async (req, res) => {
  const phone = req.params.phone;
  const stored = messageStore.get(phone);
  
  if (stored && Date.now() - stored.timestamp < 60000) { // 1 minute expiry
    res.json(stored);
  } else {
    res.json({ message: null });
  }
});

smsRouter.post("/", async (req, res) => {
  // Trim and ensure proper phone number format
  let from = (req.body.From || "").trim();
  
  // Add + prefix if missing
  if (from && !from.startsWith("+")) {
    from = "+" + from;
  }
  
  const body = (req.body.Body ?? "").trim();

  logger.info({ from, body }, "Incoming SMS");

  try {
    const command = parseCommand(body);
    logger.info({ command }, "Parsed command");
    
    // Execute command and capture response
    const response = await executeCommand(from, command);
    
    // Return response to UI
    res.status(200).json({ 
      success: true, 
      command: command.type,
      response: response || {} 
    });
  } catch (error) {
    logger.warn({ err: error }, "Failed to handle command");
    const hint = templates.invalidCommand("Try PAY 100 INR to +919876543210.");
    await sendSms(from, hint);
    res.status(200).json({ success: false, error: String(error) });
  }
});
