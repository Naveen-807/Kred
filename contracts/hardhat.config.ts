import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../backend/env.example" });
dotenv.config();

const {
  HEDERA_RPC_URL,
  HEDERA_OPERATOR_KEY,
  HEDERA_OPERATOR_ID,
  ARBITRUM_SEPOLIA_RPC_URL,
  ARBITRUM_SEPOLIA_PRIVATE_KEY
} = process.env;

const isValidPrivateKey = (value?: string | null) => {
  if (!value) return false;
  const sanitized = value.startsWith("0x") ? value.slice(2) : value;
  return /^[0-9a-fA-F]{64}$/.test(sanitized);
};

const hederaAccounts = isValidPrivateKey(HEDERA_OPERATOR_KEY)
  ? [HEDERA_OPERATOR_KEY!]
  : [];
const arbitrumAccounts = isValidPrivateKey(ARBITRUM_SEPOLIA_PRIVATE_KEY)
  ? [ARBITRUM_SEPOLIA_PRIVATE_KEY!]
  : hederaAccounts;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.25",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337
    },
    hederaTestnet: {
      url: HEDERA_RPC_URL || "https://testnet.hashio.io/api",
      accounts: hederaAccounts,
      chainId: 296,
      timeout: 120000
    },
    arbitrumSepolia: {
      url:
        ARBITRUM_SEPOLIA_RPC_URL ||
        "https://arb-sepolia.g.alchemy.com/v2/demo",
      accounts: arbitrumAccounts,
      chainId: 421614,
      timeout: 120000
    }
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || ""
    }
  },
  paths: {
    sources: "contracts",
    tests: "test",
    cache: "cache",
    artifacts: "artifacts"
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6"
  }
};

export default config;
