require('dotenv').config();
const { LitContracts } = require('@lit-protocol/contracts-sdk');

async function checkPKPTokens() {
  try {
    console.log('🔍 Checking PKP Tokens...\n');
    
    // Connect to Lit Contracts
    const litContracts = new LitContracts({
      network: 'datil-test',
    });
    await litContracts.connect();
    
    // Your minter wallet address
    const walletAddress = '0x571313e39448dF8caE9c00F66c603906e2e70214';
    
    console.log(`📊 Checking PKPs owned by: ${walletAddress}\n`);
    
    // Get PKP NFTs owned by the wallet
    const pkps = await litContracts.pkpNftContractUtils.read.getTokensByAddress(walletAddress);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total PKP NFTs Minted: ${pkps.length}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (pkps.length === 0) {
      console.log('No PKP NFTs found for this wallet.');
    } else {
      pkps.forEach((tokenId, index) => {
        console.log(`PKP #${index + 1}:`);
        console.log(`  Token ID: ${tokenId}`);
        console.log('');
      });
    }
    
    // Also check the wallet balance
    const { ethers } = require('ethers');
    const provider = new ethers.providers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
    const balance = await provider.getBalance(walletAddress);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`💰 Wallet Balance: ${ethers.utils.formatEther(balance)} ETH`);
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPKPTokens();
