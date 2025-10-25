import crypto from "node:crypto";

import axios from "axios";
import { ethers } from "ethers";

import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

export type OtpResult = {
  otp: string;
  expiresAt: Date;
  sequenceNumber?: string;
  isOnChain?: boolean;
};

/**
 * Generate OTP using on-chain Pyth Entropy (for Pyth Entropy Prize $1,000)
 * Falls back to secure local generation if contract not available
 */
export async function generateOtpOnChain(phoneNumber: string): Promise<OtpResult> {
  const USE_ONCHAIN_ENTROPY = process.env.USE_ONCHAIN_PYTH_ENTROPY === 'true';
  
  logger.info({ 
    phoneNumber, 
    onChainEnabled: USE_ONCHAIN_ENTROPY,
    contractAddress: process.env.PYTH_ENTROPY_CONTRACT_ADDRESS 
  }, "🔐 [PYTH ENTROPY] Generating OTP...");
  
  if (USE_ONCHAIN_ENTROPY && process.env.PYTH_ENTROPY_CONTRACT_ADDRESS) {
    try {
      logger.info({ phoneNumber }, "🔮 [PYTH ENTROPY] Using on-chain Pyth Entropy contract");
      
      // Connect to Hedera
      const provider = new ethers.providers.JsonRpcProvider(
        config.hedera.network === 'testnet' 
          ? 'https://testnet.hashio.io/api'
          : 'https://mainnet.hashio.io/api'
      );
      
      const wallet = new ethers.Wallet(config.hedera.operatorKey, provider);
      
      // PythEntropyOTP contract ABI (minimal for requestOTP)
      const abi = [
        "function requestOTP(string calldata phoneNumber, bytes32 userRandomNumber) external payable returns (uint64)",
        "function getOTP(string calldata phoneNumber) external view returns (uint256 otp, bool isValid, uint256 expiresAt)",
        "event OTPGenerated(uint64 indexed sequenceNumber, string phoneNumber, uint256 otp, uint256 expiresAt)"
      ];
      
      const contract = new ethers.Contract(
        process.env.PYTH_ENTROPY_CONTRACT_ADDRESS,
        abi,
        wallet
      );
      
      // Generate user random number
      const userRandom = ethers.utils.randomBytes(32);
      
      logger.info({ 
        contract: process.env.PYTH_ENTROPY_CONTRACT_ADDRESS,
        network: "Hedera Testnet"
      }, "📡 [PYTH ENTROPY] Requesting OTP from smart contract...");
      
      const tx = await contract.requestOTP(phoneNumber, userRandom, {
        value: ethers.utils.parseEther("0.001"), // Small fee for entropy
        gasLimit: 500000
      });
      
      const receipt = await tx.wait();
      logger.info({ 
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }, "✅ [PYTH ENTROPY] OTP request submitted on-chain");
      
      // Wait for callback processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Fetch the generated OTP
      const [otp, isValid, expiresAt] = await contract.getOTP(phoneNumber);
      
      if (isValid && otp.gt(0)) {
        logger.info({
          phoneNumber,
          otp: otp.toString(),
          txHash: receipt.transactionHash,
          expiresAt: new Date(expiresAt.toNumber() * 1000).toISOString()
        }, "✅✅✅ [PYTH ENTROPY] ON-CHAIN OTP GENERATED SUCCESSFULLY");
        
        return {
          otp: otp.toString(),
          expiresAt: new Date(expiresAt.toNumber() * 1000),
          sequenceNumber: receipt.transactionHash,
          isOnChain: true
        };
      }
      
      logger.warn({}, "⚠️ [PYTH ENTROPY] OTP not ready, falling back to local");
    } catch (error) {
      logger.error({ err: error, phoneNumber }, "❌ [PYTH ENTROPY] On-chain generation failed, using fallback");
    }
  } else {
    logger.info({}, "ℹ️  [PYTH ENTROPY] On-chain disabled, using secure local generation");
  }
  
  // Fallback to local secure generation
  return generateOtp();
}

export async function generateOtp(): Promise<OtpResult> {
  const otpLength = 6;
  const otp = crypto.randomInt(10 ** (otpLength - 1), 10 ** otpLength).toString();

  logger.info({ 
    otp, 
    method: "crypto.randomInt",
    expirySeconds: config.security.otpExpirySeconds 
  }, "✅ OTP generated via secure local fallback");

  return {
    otp,
    expiresAt: new Date(Date.now() + config.security.otpExpirySeconds * 1_000),
    isOnChain: false
  };
}

/**
 * AUTO-VERIFY OTP from blockchain (GAME-CHANGING INNOVATION!)
 * This eliminates the need for users to manually enter OTP
 * We read it directly from the Pyth Entropy contract
 */
export async function autoVerifyOtpFromChain(phoneNumber: string): Promise<{
  verified: boolean;
  otp?: string;
  error?: string;
}> {
  const USE_ONCHAIN_ENTROPY = process.env.USE_ONCHAIN_PYTH_ENTROPY === 'true';
  
  if (!USE_ONCHAIN_ENTROPY || !process.env.PYTH_ENTROPY_CONTRACT_ADDRESS) {
    logger.info({}, "⚠️ [AUTO-VERIFY] On-chain entropy not configured, skipping auto-verify");
    return { verified: false, error: "On-chain entropy not enabled" };
  }

  try {
    logger.info({ phoneNumber }, "🔍 [AUTO-VERIFY] Reading OTP from blockchain...");
    
    // Connect to Hedera
    const provider = new ethers.providers.JsonRpcProvider(
      config.hedera.network === 'testnet' 
        ? 'https://testnet.hashio.io/api'
        : 'https://mainnet.hashio.io/api'
    );
    
    const wallet = new ethers.Wallet(config.hedera.operatorKey, provider);
    
    // Contract ABI
    const abi = [
      "function getOTP(string calldata phoneNumber) external view returns (uint256 otp, bool isValid, uint256 expiresAt)"
    ];
    
    const contract = new ethers.Contract(
      process.env.PYTH_ENTROPY_CONTRACT_ADDRESS,
      abi,
      wallet
    );
    
    // Read OTP from contract
    const [otp, isValid, expiresAt] = await contract.getOTP(phoneNumber);
    
    // Check if OTP is valid and not expired
    const now = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = expiresAt.toNumber();
    
    if (!isValid) {
      logger.warn({ phoneNumber }, "⚠️ [AUTO-VERIFY] No valid OTP found on-chain");
      return { verified: false, error: "No OTP found" };
    }
    
    if (now > expiresAtSeconds) {
      logger.warn({ phoneNumber, expiresAt: expiresAtSeconds }, "⚠️ [AUTO-VERIFY] OTP expired");
      return { verified: false, error: "OTP expired" };
    }
    
    if (otp.eq(0)) {
      logger.warn({ phoneNumber }, "⚠️ [AUTO-VERIFY] OTP is zero");
      return { verified: false, error: "Invalid OTP" };
    }
    
    logger.info({
      phoneNumber,
      otp: otp.toString(),
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
      remainingSeconds: expiresAtSeconds - now
    }, "✅✅✅ [AUTO-VERIFY] OTP VERIFIED FROM BLOCKCHAIN - NO USER INPUT NEEDED!");
    
    return {
      verified: true,
      otp: otp.toString()
    };
    
  } catch (error) {
    logger.error({ err: error, phoneNumber }, "❌ [AUTO-VERIFY] Failed to read OTP from blockchain");
    return { verified: false, error: error.message };
  }
}
