import { Client, AccountId, PrivateKey, AccountBalanceQuery } from "@hashgraph/sdk";

console.log("🌐 Testing Hedera Connection...\n");

async function testHedera() {
  try {
    const operatorId = "0.0.7091243";
    const operatorKey = "0xd05d719c8517534454479bab488a66b23de7c3da1e4cee6e357c95ea381dce67";
    
    console.log("Connecting to Hedera testnet...");
    console.log("Account:", operatorId);
    
    const accountId = AccountId.fromString(operatorId);
    const privateKey = PrivateKey.fromStringECDSA(operatorKey);
    
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);
    
    console.log("✅ Hedera client initialized");
    
    // Check balance
    console.log("\nChecking account balance...");
    const balance = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(client);
    
    console.log("✅ Account Balance:", balance.hbars.toString());
    console.log("✅ Hedera connection: WORKING");
    
    client.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testHedera();
