import express from "express";

import { parseCommand } from "../modules/commands/parser.js";
import { executeCommand } from "../modules/commands/commandExecutor.js";
import { templates } from "../modules/sms/templates.js";
import { sendGenericSms } from "../modules/sms/sender.js";
import { getLastUIMessage, storeUIMessage } from "../modules/ui/messageStore.js";
import { logger } from "../utils/logger.js";

export const smsRouter = express.Router();

// Get stored message for UI
smsRouter.get("/last-message/:phone", async (req, res) => {
  const phone = req.params.phone;
  const stored = getLastUIMessage(phone);

  if (stored && Date.now() - stored.timestamp < 60_000) {
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
    
    // Execute command (side-effects: SMS + UI store)
    await executeCommand(from, command);
    
    // Return ack to UI
    res.status(200).json({ 
      success: true, 
      command: command.type
    });
  } catch (error) {
    logger.warn({ err: error }, "Failed to handle command");
    const hint = templates.invalidCommand("Try PAY 100 INR to +919876543210.");
    await sendGenericSms(from, hint);
    // Also store a UI hint to surface the error in dashboard
    try { storeUIMessage(from, hint, undefined, "Check command format"); } catch {}
    res.status(200).json({ success: false, error: String(error) });
  }
});
