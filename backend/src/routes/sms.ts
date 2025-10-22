import express, { Router } from "express";

import { parseCommand } from "../modules/commands/parser.js";
import { executeCommand } from "../modules/commands/commandExecutor.js";
import { templates } from "../modules/sms/templates.js";
import { sendSms } from "../services/msg91Client.js";
import { logger } from "../utils/logger.js";

export const smsRouter: Router = express.Router();

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
    await executeCommand(from, command);
    res.status(200).end();
  } catch (error) {
    logger.warn({ err: error }, "Failed to handle command");
    const hint = templates.invalidCommand("Try PAY 100 INR to +919876543210.");
    await sendSms(from, hint);
    res.status(200).end();
  }
});
