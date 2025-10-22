import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PythEntropyOTP with account:", deployer.address);

  // Pyth Entropy addresses
  // For Hedera testnet - you'll need to check if Pyth Entropy is deployed
  // For Ethereum Sepolia:
  const ENTROPY_ADDRESS = process.env.PYTH_ENTROPY_ADDRESS || "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c"; // Sepolia
  const ENTROPY_PROVIDER = process.env.PYTH_ENTROPY_PROVIDER || "0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344"; // Default provider

  console.log("Pyth Entropy Address:", ENTROPY_ADDRESS);
  console.log("Entropy Provider:", ENTROPY_PROVIDER);

  const factory = await ethers.getContractFactory("PythEntropyOTP");
  const contract = await factory.deploy(ENTROPY_ADDRESS, ENTROPY_PROVIDER);

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ PythEntropyOTP deployed to:", address);
  console.log("Transaction hash:", contract.deploymentTransaction()?.hash);
  
  console.log("\n📝 Add to .env:");
  console.log(`PYTH_ENTROPY_CONTRACT_ADDRESS=${address}`);
  
  console.log("\n🧪 Test the contract:");
  console.log(`npx hardhat verify --network sepolia ${address} ${ENTROPY_ADDRESS} ${ENTROPY_PROVIDER}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
