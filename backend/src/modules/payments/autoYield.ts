/**
 * Auto-Yield Service
 * 
 * Automatically supplies incoming funds to Aave to earn yield.
 * This makes every OfflinePay wallet a yield-bearing neobank account.
 * 
 * KEY INNOVATION: Users' money is NEVER idle - it's always earning interest.
 */

import { autoSupplyToAave, isVincentConfigured } from "../vincent/vincentClient.js";
import { logger } from "../../utils/logger.js";
import { UserModel } from "../../models/User.js";

/**
 * Automatically supply funds to Aave when a user receives payment
 * This is called AFTER a successful payment is received
 */
export async function autoYieldOnReceive(
  recipientPhone: string,
  recipientWallet: string,
  amountPyusd: number
): Promise<void> {
  try {
    // Only auto-supply if Vincent is configured
    if (!isVincentConfigured()) {
      logger.info("Vincent not configured, skipping auto-yield");
      return;
    }

    // Only auto-supply if amount is meaningful (> $1)
    if (amountPyusd < 1) {
      logger.info({ amount: amountPyusd }, "Amount too small for auto-yield");
      return;
    }

    logger.info(
      { recipientPhone, recipientWallet, amount: amountPyusd },
      "Auto-supplying received funds to Aave for yield"
    );

    const result = await autoSupplyToAave(
      recipientWallet,
      recipientPhone,
      {
        amount: amountPyusd.toFixed(2),
        network: "sepolia"
      }
    );

    if (result.success) {
      logger.info(
        { txHash: result.txHash, amount: amountPyusd },
        " Funds auto-supplied to Aave - now earning yield!"
      );

      // Update user record to track yield
      await UserModel.findOneAndUpdate(
        { phoneNumber: recipientPhone },
        {
          $inc: { "yieldStats.totalSupplied": amountPyusd },
          $set: { "yieldStats.lastSupplyDate": new Date() }
        }
      );
    } else {
      logger.warn(
        { error: result.error },
        "Auto-supply to Aave failed - funds remain in wallet"
      );
    }
  } catch (error) {
    logger.error(
      { err: error, recipientPhone },
      "Error in auto-yield process - funds remain in wallet"
    );
    // Don't throw - auto-yield failure shouldn't block payment
  }
}

/**
 * Get yield summary for a user (for STATUS command)
 */
export async function getYieldSummary(phoneNumber: string): Promise<string> {
  try {
    const user = await UserModel.findOne({ phoneNumber });
    if (!user || !user.yieldStats) {
      return " Yield: Not yet earning (send/receive payments to start)";
    }

    const totalSupplied = user.yieldStats.totalSupplied || 0;
    const estimatedApy = 3.5; // Typical Aave PYUSD APY
    const estimatedYearlyYield = totalSupplied * (estimatedApy / 100);
    const estimatedDailyYield = estimatedYearlyYield / 365;

    return ` Yield Stats:
Supplied: $${totalSupplied.toFixed(2)} PYUSD
Est. APY: ${estimatedApy}%
Est. Daily: $${estimatedDailyYield.toFixed(4)}
Your money is working for you! `;
  } catch (error) {
    logger.error({ err: error, phoneNumber }, "Failed to get yield summary");
    return " Yield: Unable to fetch stats";
  }
}
