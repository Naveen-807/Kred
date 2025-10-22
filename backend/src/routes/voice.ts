import express from "express";
import { logger } from "../utils/logger.js";
import { handleMissedCall } from "../modules/vincent/invisibleOnboarding.js";

export const voiceRouter = express.Router();

// REVOLUTIONARY FEATURE: Invisible Onboarding via Missed Call
// User makes a missed call → Wallet created → SMS confirmation
// No app, no browser, no complexity!
voiceRouter.post("/", async (req, res) => {
  // Trim and format phone number
  let from = (req.body.From || "").trim();
  if (from && !from.startsWith("+")) {
    from = "+" + from;
  }

  const callStatus = req.body.CallStatus;
  
  logger.info({ from, callStatus, body: req.body }, "📞 Incoming voice call");

  try {
    // Handle missed call or any incoming call
    // This triggers invisible onboarding for new users
    await handleMissedCall(from);

    // Respond to Twilio - we don't need to answer the call
    // User just needs to make the call, we'll handle the rest
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Welcome to OfflinePay. Please check your SMS for your wallet details.</Say>
  <Hangup/>
</Response>`);
  } catch (error) {
    logger.error({ err: error, from }, "Failed to handle voice call");
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we encountered an error. Please try again later.</Say>
  <Hangup/>
</Response>`);
  }
});

voiceRouter.post("/gather", (req, res) => {
  const digits = req.body.Digits;
  logger.info({ digits }, "Voice input received");

  // Future: Voice PIN entry
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Voice PIN entry coming soon. Please use SMS for now.</Say>
  <Hangup/>
</Response>`);
});