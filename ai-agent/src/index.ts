import dotenv from "dotenv";
import mongoose from "mongoose";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { sendSms } from "../../backend/src/services/msg91Client.js";
import { config as backendConfig } from "../../backend/src/config/index.js";
import { SbtPassportModel } from "../../backend/src/models/SBTPassport.js";
import { UserModel } from "../../backend/src/models/User.js";
import { templates } from "../../backend/src/modules/sms/templates.js";
import { logger } from "../../backend/src/utils/logger.js";

dotenv.config({ path: "../../backend/env.example" });
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

async function connectMongo() {
  await mongoose.connect(backendConfig.mongoUri);
}

async function analyzeUser(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) return;

  const sbts = await SbtPassportModel.find({ walletAddress: user.walletAddress }).sort({ timestamp: -1 }).limit(25);
  const prompt = `Analyze the following OfflinePay transactions and determine micro-loan eligibility. Return JSON {"eligible": boolean, "loanAmount": number, "confidence": number}.
Transactions: ${JSON.stringify(sbts)}`;

  const response = await model.generateContent(prompt);
  const text = response.response.text();
  const result = JSON.parse(text);

  if (result.eligible) {
    await sendSms(user.phoneNumber, templates.loanOffer(result.loanAmount));
  }
}

async function run() {
  await connectMongo();
  const users = await UserModel.find({});
  for (const user of users) {
    try {
      await analyzeUser(user._id.toString());
    } catch (error) {
      logger.error({ err: error, user: user.phoneNumber }, "AI agent failed");
    }
  }
  await mongoose.disconnect();
}

run().catch((error) => {
  logger.error({ err: error }, "AI agent run failed");
  process.exit(1);
});



