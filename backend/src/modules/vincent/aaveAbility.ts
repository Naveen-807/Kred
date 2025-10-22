import { getVincentSdk } from "./sdk.js";
import { computePyusdFromFiat, formatToTokenDecimals } from "./helpers.js";
import { getInrUsdPrice } from "./priceFeed.js";
import { logger } from "../../utils/logger.js";
import { config } from "../../config/index.js";
import { ethers } from "ethers";

export async function executeAaveWithdrawAndSend(params: {
  amountFiat: number;
  currency: string;
  recipientWallet: string;
  userWallet: string;
  commandId: string;
}) {
  const vincent = getVincentSdk();
  try {
    const price = await getInrUsdPrice();
    const pyusd = computePyusdFromFiat({ amountFiat: params.amountFiat, fiatPriceUsd: price });
    const amount = formatToTokenDecimals(pyusd);

    const result = await vincent.executeAbility({
      abilityId: process.env.VINCENT_ABILITY_AAVE_WITHDRAW_AND_SEND!,
      params: {
        amount,
        recipientWallet: params.recipientWallet,
        userWallet: params.userWallet
      },
      commandId: params.commandId
    });

    return result;
  } catch (error) {
    logger.error({ err: error, params }, "Failed to execute Aave withdraw and send");
    throw error;
  }
}

export async function executeAutoSupply(params: {
  userWallet: string;
  availableBalance: string;
  reserveAmount: string;
}) {
  const vincent = getVincentSdk();
  return vincent.executeAbility({
    abilityId: process.env.VINCENT_ABILITY_AAVE_AUTO_SUPPLY!,
    params
  });
}

export async function executeVincentPayment(
  senderWallet: string,
  recipientWallet: string,
  pyusdAmount: number
): Promise<string> {
  try {
    logger.info(
      { sender: senderWallet, recipient: recipientWallet, amount: pyusdAmount },
      "Executing Vincent payment"
    );

    // Generate a mock transaction hash for demo
    // TODO: Integrate with actual Vincent SDK once configured
    const commandId = `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const mockTxHash = `0x${ethers.id(commandId).slice(2, 66)}`;

    logger.warn(
      { mockTxHash, commandId },
      "Using mock transaction - Vincent SDK not fully configured"
    );

    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return mockTxHash;
  } catch (error) {
    logger.error({ err: error, sender: senderWallet, recipient: recipientWallet }, "Vincent payment failed");
    throw error;
  }
}
