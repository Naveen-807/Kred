import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.25",
  networks: {
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      accounts: ["0xd05d719c8517534454479bab488a66b23de7c3da1e4cee6e357c95ea381dce67"],
      chainId: 296
    }
  }
};

export default config;
