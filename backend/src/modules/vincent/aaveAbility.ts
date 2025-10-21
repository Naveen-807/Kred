import { getVincentSdk } from "./sdk.js";
import { computePyusdFromFiat, formatToTokenDecimals } from "./helpers.js";
import { getInrUsdPrice } from "./priceFeed.js";
import { logger } from "../../utils/logger.js";

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
