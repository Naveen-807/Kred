/**
 * Simple SMS Gateway Routes
 * /incoming - Receives SMS from Termux
 * /outgoing - Returns messages for Termux to send
 */

import { Router } from 'express';
import { smsQueue } from "../modules/sms-queue/index.js";

const router = Router();

// Simple in-memory queue for outgoing messages (keeping for backward compatibility)
const outgoingQueue: Array<{ id: string; to: string; body: string }> = [];
let messageIdCounter = 0;

/**
 * POST /incoming
 * Receives SMS from Termux gateway
 */
router.post('/incoming', async (req, res) => {
  try {
    const { from, body } = req.body;
    
    console.log(`📥 Received SMS from ${from}: ${body}`);
    
    // Process the SMS command
    let responseMessage = '';
    
    if (body?.toUpperCase() === 'OTP') {
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      responseMessage = `Your OTP is: ${otp}. Valid for 5 minutes.`;
      console.log(`Generated OTP ${otp} for ${from}`);
      
    } else if (body?.toUpperCase() === 'HELP') {
      responseMessage = 'Commands: OTP, PAY <amount> INR to <phone>, BALANCE, HELP';
      
    } else if (body?.toUpperCase().startsWith('PAY')) {
      // Extract payment details
      const match = body.match(/PAY\s+(\d+)\s+INR\s+(?:to|TO)\s+(\+?\d+)/i);
      if (match) {
        const amount = match[1];
        const recipient = match[2];
        responseMessage = `Payment of ${amount} INR to ${recipient} is being processed. You'll receive confirmation shortly.`;
        console.log(`Payment request: ${amount} INR from ${from} to ${recipient}`);
      } else {
        responseMessage = 'Invalid payment format. Use: PAY 100 INR TO +91XXXXXXXXXX';
      }
      
    } else if (body?.toUpperCase() === 'BALANCE') {
      responseMessage = 'Your balance: 500 INR (PYUSD: 5.95)';
      
    } else {
      responseMessage = 'Unknown command. Send HELP for available commands.';
    }
    
    // Add response to outgoing queue (backward compatibility)
    const msgId = `msg_${Date.now()}_${++messageIdCounter}`;
    outgoingQueue.push({
      id: msgId,
      to: from,
      body: responseMessage
    });
    
    // Also add to proper SMS queue for actual SMS sending
    const gatewayMsgId = smsQueue.addMessage(from, responseMessage, 'normal');
    
    console.log(`📤 Queued response message ${msgId} to ${from}`);
    console.log(`📤 Also queued for gateway: ${gatewayMsgId}`);
    
    res.json({
      status: 'ok',
      message: 'SMS processed',
      response: responseMessage
    });
    
  } catch (error) {
    console.error('Error processing incoming SMS:', error);
    res.status(500).json({ error: 'Failed to process SMS' });
  }
});

/**
 * GET /outgoing
 * Returns queued messages for Termux to send
 */
router.get('/outgoing', (req, res) => {
  try {
    // Return all messages and clear the queue
    const messages = [...outgoingQueue];
    outgoingQueue.length = 0; // Clear queue
    
    if (messages.length > 0) {
      console.log(`📬 Sending ${messages.length} outgoing messages to Termux`);
    }
    
    res.json(messages);
    
  } catch (error) {
    console.error('Error fetching outgoing messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    gateway: 'sms-simple',
    queueSize: outgoingQueue.length,
    timestamp: new Date().toISOString()
  });
});

export default router;
