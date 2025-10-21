import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ProofOfCommerceSBT with account:", deployer.address);

  const minter = process.env.SBT_MINTER_ADDRESS || deployer.address;

  const factory = await ethers.getContractFactory("ProofOfCommerceSBT");
  const contract = await factory.deploy(deployer.address, minter);

  const receipt = await contract.waitForDeployment();

  console.log("ProofOfCommerceSBT deployed to:", await contract.getAddress());
  console.log("Transaction hash:", receipt.deploymentTransaction()?.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
