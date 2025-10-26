import dotenv from "dotenv";

dotenv.config();

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "8080", 10),
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/offlinepay",
  vincent: {
    appId: process.env.VINCENT_APP_ID ?? "",
    abilityIds: {
      aaveWithdrawAndSend: process.env.VINCENT_ABILITY_AAVE_WITHDRAW_AND_SEND ?? "",
      aaveAutoSupply: process.env.VINCENT_ABILITY_AAVE_AUTO_SUPPLY ?? "",
      nativeSend: process.env.VINCENT_ABILITY_NATIVE_SEND ?? ""
    },
    delegateePrivateKey: process.env.VINCENT_DELEGATEE_PRIVATE_KEY ?? "",
    rpcUrl: process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api"
  },
  hedera: {
    network: process.env.HEDERA_NETWORK ?? "testnet",
    operatorId: process.env.HEDERA_OPERATOR_ID ?? "",
    operatorKey: process.env.HEDERA_OPERATOR_KEY ?? "",
    pyusdTokenAddress: process.env.HEDERA_PYUSD_TOKEN_ADDRESS ?? "",
    sbtContractAddress: process.env.HEDERA_SBT_CONTRACT_ADDRESS ?? ""
  },
  pyth: {
    entropyApiUrl: process.env.PYTH_ENTROPY_API_URL ?? "",
    inrUsdPriceFeedId: process.env.PYTH_INR_USD_FEED_ID ?? ""
  },
  transak: {
    apiKey: process.env.TRANSAK_API_KEY ?? "",
    partnerId: process.env.TRANSAK_PARTNER_ID ?? "",
    baseUrl: process.env.TRANSAK_BASE_URL ?? "https://api.transak.com"
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? ""
  },
  security: {
    otpExpirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS ?? "300", 10),
    maxFailedAttempts: parseInt(process.env.MAX_FAILED_ATTEMPTS ?? "3", 10)
  }
};
