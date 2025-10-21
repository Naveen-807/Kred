import axios from "axios";

import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import { UserModel } from "../../models/User.js";

const instance = axios.create({
  baseURL: config.transak.baseUrl,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": config.transak.apiKey
  }
});

export async function ensureDepositWallet(phoneNumber: string) {
  const user = await UserModel.findOne({ phoneNumber });
  if (!user) {
    throw new Error("User not found");
  }

  if (user.transakDepositWallet) {
    return user.transakDepositWallet;
  }

  const response = await instance.post("/stream/wallet", {
    partnerId: config.transak.partnerId,
    userId: user._id.toString(),
    currency: "INR"
  });

  const address = response.data.depositAddress;
  user.transakDepositWallet = address;
  await user.save();
  return address;
}

export async function submitSellOrder(phoneNumber: string, amount: number) {
  const wallet = await ensureDepositWallet(phoneNumber);
  logger.info({ phoneNumber, wallet, amount }, "Transak deposit wallet ensured");
  return wallet;
}
