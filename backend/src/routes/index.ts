import type { Express } from "express";

import { smsGatewayRouter } from "./sms-gateway.js";
import smsSimpleRouter from "./sms-simple.js";
import smsMobileAPIRouter from "./smsmobileapi.js";
import { internalApiRouter } from "./internal-api.js";

export function registerRoutes(app: Express) {
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // SMS Mobile API - Core functionality
  app.use("/", smsSimpleRouter);  // This includes /incoming and /outgoing
  
  // SMSMobileAPI Webhook (for Android 15 SMS gateway - India only +91)
  app.use("/sms", smsMobileAPIRouter);  // Includes /sms/webhook
  
  // SMS Gateway management routes
  app.use("/webhook", smsGatewayRouter);  // SMS Gateway routes
  app.use("/api/gateway", smsGatewayRouter);  // Gateway management
  
  // Internal API for ASI Agents
  app.use("/api/internal", internalApiRouter);
}
