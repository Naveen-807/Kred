import { ethers } from "ethers";

console.log("🔐 Testing Wallet Generation...\n");

const phoneNumber = "+918807942886";
const seed = ethers.id(phoneNumber);
const wallet = new ethers.Wallet(seed);

console.log("✅ Wallet Generated:");
console.log("Phone:", phoneNumber);
console.log("Address:", wallet.address);
console.log("Public Key:", wallet.signingKey.publicKey);
console.log("\n✅ Wallet creation: WORKING");
