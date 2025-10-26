require('dotenv').config();
const { LitNodeClient } = require('@lit-protocol/lit-node-client');
const { LitContracts } = require('@lit-protocol/contracts-sdk');
// Load ethers v5 components from ethersproject
const { JsonRpcProvider } = require('@ethersproject/providers');
const { Wallet } = require('@ethersproject/wallet');
const { formatEther, keccak256, toUtf8Bytes } = require('@ethersproject/units');

async function mintPKP() {
  try {
    console.log('🔑 Starting PKP Mint Test...\n');
    
    // Step 1: Connect to Lit Network
    console.log('1️⃣ Connecting to Lit Network (datil-test)...');
    const litNodeClient = new LitNodeClient({
      litNetwork: 'datil-test',
      debug: false,
    });
    await litNodeClient.connect();
    console.log('✅ Connected to Lit Network\n');
    
    // Step 2: Setup wallet (ethers v5 syntax)
    console.log('2️⃣ Setting up wallet...');
    const privateKey = process.env.PKP_MINTER_PRIVATE_KEY;
    console.log('Private Key:', privateKey ? `${privateKey.slice(0, 10)}...${privateKey.slice(-4)}` : 'NOT FOUND');
    
    const provider = new JsonRpcProvider(
      process.env.LIT_RPC_URL || 'https://yellowstone-rpc.litprotocol.com'
    );
    
    const signer = new Wallet(privateKey, provider);
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    
    console.log('Wallet Address:', address);
    console.log('Balance:', formatEther(balance), 'ETH');
    
    if (balance.eq(0)) {
      console.log('\n⚠️  WARNING: Wallet has 0 balance!');
      console.log('You need testnet ETH to mint PKPs.');
      console.log('Get testnet ETH from: https://faucet.litprotocol.com');
      return;
    }
    console.log('✅ Wallet funded\n');
    
    // Step 3: Connect to Lit Contracts
    console.log('3️⃣ Connecting to Lit Contracts...');
    const litContracts = new LitContracts({
      signer,
      network: 'datil-test',
    });
    await litContracts.connect();
    console.log('✅ Connected to Lit Contracts\n');
    
    // Step 4: Mint PKP
    console.log('4️⃣ Minting PKP NFT...');
    console.log('This may take 30-60 seconds...\n');
    
    const mintInfo = await litContracts.pkpNftContractUtils.write.mint();
    
    console.log('✅ PKP MINTED SUCCESSFULLY!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 PKP Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Token ID:', mintInfo.pkp.tokenId);
    console.log('Public Key:', mintInfo.pkp.publicKey);
    console.log('ETH Address:', mintInfo.pkp.ethAddress);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Test phone number
    const testPhone = '+1234567890';
    const { keccak256: keccak, toUtf8Bytes } = require('@ethersproject/hash');
    const authMethodId = keccak(toUtf8Bytes(testPhone));
    
    console.log('5️⃣ Adding auth method for phone:', testPhone);
    console.log('Auth Method ID:', authMethodId);
    
    // Note: Adding auth method requires additional setup
    console.log('\n✅ PKP Wallet minted successfully!');
    console.log('You can now use this wallet in the SMS gateway.');
    
    await litNodeClient.disconnect();
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

console.log(`
╔════════════════════════════════════════════╗
║         🔑 PKP Mint Test Script           ║
╚════════════════════════════════════════════╝
`);

mintPKP()
  .then(() => {
    console.log('\n🎉 Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
