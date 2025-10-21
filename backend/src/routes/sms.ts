import express from "express";

import { parseCommand } from "../modules/commands/parser.js";
import { executeCommand } from "../modules/commands/commandExecutor.js";
import { templates } from "../modules/sms/templates.js";
import { twilioClient } from "../services/twilioClient.js";
import { logger } from "../utils/logger.js";

export const smsRouter = express.Router();

smsRouter.post("/", async (req, res) => {
  const from = req.body.From;
  const body = req.body.Body ?? "";

  logger.info({ from, body }, "Incoming SMS");

  try {
    const command = parseCommand(body);
    logger.info({ command }, "Parsed command");
    await executeCommand(from, command);
    res.status(200).end();
  } catch (error) {
    logger.warn({ err: error }, "Failed to handle command");
    const hint = templates.invalidCommand("Try PAY 100 INR to +919876543210.");
    await twilioClient.messages.create({
      to: from,
      from: req.body.To,
      body: hint
    });
    res.status(200).end();
  }
});
