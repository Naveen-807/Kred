/**
 * Simplified SMS-to-Blockchain Server
 * User sends: "Send 20 PYUSD"
 * System: Generates OTP, mints wallet, sends single SMS
 */

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import simplified SMS handler
import simplifiedSMSRouter from './src/routes/simplified-sms.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Simplified SMS-to-Blockchain Flow' });
});

// Simplified SMS webhook
app.use('/sms', simplifiedSMSRouter);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(` Simplified SMS-to-Blockchain Server running on port ${PORT}`);
  console.log(`📱 Webhook endpoint: POST http://localhost:${PORT}/sms/webhook`);
  console.log(`🏥 Health endpoint: GET http://localhost:${PORT}/health`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Flow: User sends "Send X PYUSD" → OTP + Wallet + Single SMS`);
});
