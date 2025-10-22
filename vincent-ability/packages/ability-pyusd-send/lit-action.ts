/**
 * Lit Action: PYUSD Send
 * Transfers PYUSD tokens from user wallet to recipient
 */

import { ethers } from "ethers";

// ERC-20 ABI for transfer function
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)"
];

export async function litAction() {
  try {
    // Get parameters from Vincent
    const { amount, recipient, token, userWallet } = Lit.Actions.getParams();

    // Validate inputs
    if (!amount || !recipient || !token) {
      throw new Error("Missing required parameters: amount, recipient, or token");
    }

    // Connect to Hedera RPC
    const rpcUrl = "https://testnet.hashio.io/api";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Get user's PKP (Programmable Key Pair) from Lit
    const pkpWallet = new ethers.Wallet(Lit.Actions.getPkpPrivateKey(), provider);

    // Create contract instance
    const tokenContract = new ethers.Contract(token, ERC20_ABI, pkpWallet);

    // Check balance
    const balance = await tokenContract.balanceOf(pkpWallet.address);
    if (balance < BigInt(amount)) {
      throw new Error(`Insufficient balance. Have: ${balance}, Need: ${amount}`);
    }

    // Execute transfer
    const tx = await tokenContract.transfer(recipient, amount);
    await tx.wait();

    // Return transaction details
    Lit.Actions.setResponse({
      success: true,
      txHash: tx.hash,
      from: pkpWallet.address,
      to: recipient,
      amount: amount.toString()
    });
  } catch (error) {
    Lit.Actions.setResponse({
      success: false,
      error: error.message
    });
  }
}

// Execute the action
litAction();
