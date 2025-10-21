import { twilioClient } from "../../services/twilioClient.js";

import { templates } from "./templates.js";

export async function sendLoanOfferSms(phone: string, amount: number) {
  await twilioClient.messages.create({
    to: phone,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: templates.loanOffer(amount)
  });
}

export async function sendGenericSms(phone: string, message: string) {
  await twilioClient.messages.create({
    to: phone,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: message
  });
}
