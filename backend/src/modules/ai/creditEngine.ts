import { GoogleGenerativeAI } from "@google/generative-ai";

import { config } from "../../config/index.js";
import { SbtPassportModel } from "../../models/SBTPassport.js";
import { UserModel } from "../../models/User.js";
import { sendLoanOfferSms } from "../sms/sender.js";

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function analyzeUserCredit(phoneNumber: string) {
  const user = await UserModel.findOne({ phoneNumber });
  if (!user) {
    throw new Error("User not found");
  }

  const sbts = await SbtPassportModel.find({ walletAddress: user.walletAddress }).lean();
  const prompt = `Analyze transaction history and return JSON { "eligible": boolean, "loanAmount": number, "confidence": number }
Transactions: ${JSON.stringify(sbts.slice(-10))}`;

  const response = await model.generateContent(prompt);
  const text = response.response.text();
  const result = JSON.parse(text);

  if (result.eligible) {
    await sendLoanOfferSms(phoneNumber, result.loanAmount);
  }

  return result;
}
