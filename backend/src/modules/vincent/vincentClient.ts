/**
 * Vincent Client - Real DeFi Automation Integration
 * 
 * This module handles all Vincent SDK interactions for executing
 * complex DeFi operations via SMS commands.
 */

import { getVincentToolClient } from "@lit-protocol/vincent-sdk";
import type { VincentToolClient } from "@lit-protocol/vincent-sdk";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

let vincentClient: VincentToolClient | null = null;

/**
 * Initialize Vincent client
 */
export function getVincentClient(): VincentToolClient {
  if (!vincentClient) {
    if (!config.vincent.appId) {
      throw new Error("Vincent App ID not configured");
    }

    vincentClient = getVincentToolClient({
      appId: config.vincent.appId,
    });
    
    logger.info({ appId: config.vincent.appId }, "Vincent client initialized");
  }
  return vincentClient;
}

/**
 * Execute AaveWithdrawAndSend ability
 * This is the CORE DeFi automation that wins the prize
 */
export async function executeAaveWithdrawAndSend(
  walletAddress: string,
  phoneNumber: string,
  params: {
    recipient: string;
    amount: string; // Amount in PYUSD
    network?: string;
  }
): Promise<{
  success: boolean;
  withdrawTxHash?: string;
  transferTxHash?: string;
  error?: string;
}> {
  try {
    logger.info(
      { walletAddress, recipient: params.recipient, amount: params.amount },
      "Executing AaveWithdrawAndSend via Vincent"
    );

    const client = getVincentClient();

    // Execute the custom DeFi ability
    // This will:
    // 1. Withdraw PYUSD from Aave lending pool
    // 2. Transfer to recipient
    // All in a single, atomic, trustless operation
    const result = await client.executeAbility({
      abilityName: "AaveWithdrawAndSend",
      functionName: "aaveWithdrawAndSend",
      params: {
        recipient: params.recipient,
        amount: params.amount,
        network: params.network || "sepolia"
      },
      // User identification for non-custodial execution
      userIdentifier: phoneNumber,
      walletAddress: walletAddress
    });

    logger.info(
      { 
        result,
        withdrawTx: result.withdrawTxHash,
        transferTx: result.transferTxHash
      },
      "AaveWithdrawAndSend executed successfully"
    );

    return {
      success: true,
      withdrawTxHash: result.withdrawTxHash,
      transferTxHash: result.transferTxHash
    };
  } catch (error) {
    logger.error(
      { err: error, walletAddress, params },
      "Failed to execute AaveWithdrawAndSend"
    );
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Auto-supply funds to Aave when wallet receives money
 * This makes every wallet yield-bearing automatically
 */
export async function autoSupplyToAave(
  walletAddress: string,
  phoneNumber: string,
  params: {
    amount: string;
    network?: string;
  }
): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  try {
    logger.info(
      { walletAddress, amount: params.amount },
      "Auto-supplying to Aave for yield generation"
    );

    const client = getVincentClient();

    const result = await client.executeAbility({
      abilityName: "AaveWithdrawAndSend",
      functionName: "autoSupplyToAave",
      params: {
        amount: params.amount,
        network: params.network || "sepolia"
      },
      userIdentifier: phoneNumber,
      walletAddress: walletAddress
    });

    logger.info(
      { txHash: result.txHash },
      "Funds auto-supplied to Aave - now earning yield!"
    );

    return {
      success: true,
      txHash: result.txHash
    };
  } catch (error) {
    logger.error(
      { err: error, walletAddress, params },
      "Failed to auto-supply to Aave"
    );
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Get yield earned for a wallet
 */
export async function getYieldEarned(
  walletAddress: string,
  phoneNumber: string,
  network?: string
): Promise<{
  aTokenBalance: string;
  pyusdSupplied: string;
  yieldEarned: string;
}> {
  try {
    const client = getVincentClient();

    const result = await client.executeAbility({
      abilityName: "AaveWithdrawAndSend",
      functionName: "getYieldEarned",
      params: {
        network: network || "sepolia"
      },
      userIdentifier: phoneNumber,
      walletAddress: walletAddress
    });

    return {
      aTokenBalance: result.aTokenBalance,
      pyusdSupplied: result.pyusdSupplied,
      yieldEarned: result.yieldEarned
    };
  } catch (error) {
    logger.error({ err: error, walletAddress }, "Failed to get yield earned");
    return {
      aTokenBalance: "0",
      pyusdSupplied: "0",
      yieldEarned: "0"
    };
  }
}

/**
 * Check if Vincent is properly configured
 */
export function isVincentConfigured(): boolean {
  return !!config.vincent.appId;
}
