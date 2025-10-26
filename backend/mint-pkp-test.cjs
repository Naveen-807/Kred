require('dotenv').config({ path: '.env' });
const { LitContracts } = require('@lit-protocol/contracts-sdk');

async function mintPKP() {
  console.log('\n🔑 Minting PKP Wallet for Phone Number...\n');
  
  try {
    // Initialize Lit Contracts (this handles the signer internally)
    console.log('1️⃣ Connecting to Lit Protocol (datil-test)...');
    const litContracts = new LitContracts({
      privateKey: process.env.PKP_MINTER_PRIVATE_KEY,
      network: 'datil-test',
      debug: false
    });
    
    await litContracts.connect();
    console.log('✅ Connected!\n');
    
    console.log('2️⃣ Minting PKP NFT...');
    console.log('⏳ Please wait 30-60 seconds...\n');
    
    // Mint the PKP
    const mintTx = await litContracts.pkpNftContractUtils.write.mint();
    
    console.log('✅ PKP MINTED SUCCESSFULLY!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 PKP WALLET DETAILS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Token ID:', mintTx.pkp.tokenId);
    console.log('Public Key:', mintTx.pkp.publicKey);
    console.log('ETH Address:', mintTx.pkp.ethAddress);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('🎉 PKP wallet created successfully!');
    console.log('💡 This wallet can now be used for phone number:', '+1234567890');
    
    return mintTx.pkp;
    
  } catch (error) {
    console.error('\n❌ MINTING FAILED:');
    console.error('Error:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.error('\n💡 Your wallet needs testnet ETH to mint PKPs');
      console.error('Get testnet ETH from: https://faucet.litprotocol.com');
    }
    
    if (error.message.includes('invalid private key')) {
      console.error('\n💡 Check PKP_MINTER_PRIVATE_KEY in .env file');
    }
    
    throw error;
  }
}

// Run the mint
console.log(`
╔════════════════════════════════════════════╗
║      🔐 PKP WALLET MINT TEST              ║
║      Lit Protocol (datil-test)            ║
╚════════════════════════════════════════════╝
`);

mintPKP()
  .then(() => {
    console.log('\n✅ Test completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed\n');
    process.exit(1);
  });
