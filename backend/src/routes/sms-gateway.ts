/**
 * SMS Gateway Route
 * Handles incoming SMS from React Native gateway app
 */

import express from "express";
import { handleSMSFromGateway } from "../modules/sms-gateway/handler.js";
import { smsQueue } from "../modules/sms-queue/index.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * POST /webhook/sms-gateway
 * Receives SMS from React Native gateway app
 */
router.post("/sms-gateway", async (req, res) => {
  try {
    const { from, body, timestamp, gatewayId } = req.body;
    const apiKey = req.headers['x-api-key'];
    const requestGatewayId = req.headers['x-gateway-id'];

    // Validate request
    if (!from || !body) {
      return res.status(400).json({
        error: "Missing required fields: from, body"
      });
    }

    // API key authentication
    if (apiKey !== process.env.GATEWAY_API_KEY) {
      logger.warn({ gatewayId, from }, "Invalid API key for SMS gateway");
      return res.status(401).json({ error: "Invalid API key" });
    }

    logger.info({
      from,
      body: body.substring(0, 50),
      gatewayId: gatewayId || requestGatewayId,
      timestamp
    }, "📱 SMS received from gateway");

    // Process SMS
    const result = await handleSMSFromGateway(from, body, gatewayId || requestGatewayId);

    // Return response (will be sent as SMS back to user)
    res.json({
      success: true,
      message: "SMS processed successfully",
      smsResponse: result.response, // SMS to send back to user
      data: result.data
    });

  } catch (error) {
    logger.error({ err: error }, "Error processing SMS from gateway");
    res.status(500).json({
      error: "Failed to process SMS",
      message: error.message
    });
  }
});

/**
 * POST /api/gateway/register
 * Register a new gateway device
 */
router.post("/register", async (req, res) => {
  try {
    const { gatewayId, phoneNumber, platform, version } = req.body;

    logger.info({ gatewayId, phoneNumber, platform }, "Gateway registration request");

    // Store gateway info in database
    // TODO: Implement gateway registration in database

    res.json({
      success: true,
      gatewayId,
      message: "Gateway registered successfully"
    });

  } catch (error) {
    logger.error({ err: error }, "Gateway registration failed");
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /api/gateway/heartbeat
 * Receive heartbeat from gateway
 */
router.post("/heartbeat", async (req, res) => {
  try {
    const { gatewayId, timestamp } = req.body;
    
    // Update last seen timestamp
    // TODO: Implement in database

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: "Heartbeat failed" });
  }
});

/**
 * GET /api/gateway/:gatewayId/stats
 * Get gateway statistics
 */
router.get("/:gatewayId/stats", async (req, res) => {
  try {
    const { gatewayId } = req.params;

    // TODO: Get stats from database

    res.json({
      gatewayId,
      messagesSent: 0,
      messagesReceived: 0,
      lastSeen: new Date().toISOString(),
      isActive: true
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

/**
 * GET /api/gateway/outgoing
 * Get pending outgoing messages for Termux to send
 * This is polled by Termux every few seconds
 */
router.get("/outgoing", async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const limit = parseInt(req.query.limit as string) || 10;

    // API key authentication
    if (apiKey !== process.env.GATEWAY_API_KEY) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    // Get pending messages from queue
    const messages = smsQueue.getPendingMessages(limit);
    
    logger.debug({ count: messages.length }, '📬 Fetching pending messages for gateway');

    res.json({
      success: true,
      messages: messages.map(msg => ({
        id: msg.id,
        to: msg.to,
        body: msg.body,
        priority: msg.priority
      }))
    });

  } catch (error) {
    logger.error({ err: error }, 'Error fetching outgoing messages');
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * POST /api/gateway/sent
 * Mark message as successfully sent
 * Called by Termux after sending SMS
 */
router.post("/sent", async (req, res) => {
  try {
    const { messageId } = req.body;
    const apiKey = req.headers['x-api-key'];

    // API key authentication
    if (apiKey !== process.env.GATEWAY_API_KEY) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    if (!messageId) {
      return res.status(400).json({ error: "Missing messageId" });
    }

    const success = smsQueue.markAsSent(messageId);

    if (!success) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json({ success: true });

  } catch (error) {
    logger.error({ err: error }, 'Error marking message as sent');
    res.status(500).json({ error: "Failed to update message status" });
  }
});

/**
 * POST /api/gateway/failed
 * Mark message as failed
 * Called by Termux if SMS sending fails
 */
router.post("/failed", async (req, res) => {
  try {
    const { messageId, error: errorMsg } = req.body;
    const apiKey = req.headers['x-api-key'];

    // API key authentication
    if (apiKey !== process.env.GATEWAY_API_KEY) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    if (!messageId) {
      return res.status(400).json({ error: "Missing messageId" });
    }

    const success = smsQueue.markAsFailed(messageId, errorMsg || 'Unknown error');

    if (!success) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json({ success: true });

  } catch (error) {
    logger.error({ err: error }, 'Error marking message as failed');
    res.status(500).json({ error: "Failed to update message status" });
  }
});

/**
 * GET /api/gateway/queue-stats
 * Get queue statistics (for debugging)
 */
router.get("/queue-stats", async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];

    // API key authentication
    if (apiKey !== process.env.GATEWAY_API_KEY) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const stats = smsQueue.getStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error({ err: error }, 'Error fetching queue stats');
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export { router as smsGatewayRouter };
