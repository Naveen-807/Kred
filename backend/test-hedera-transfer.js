import { Client, AccountId, PrivateKey, TransferTransaction, Hbar } from "@hashgraph/sdk";

console.log("💸 Testing Hedera HBAR Transfer...\n");

async function testTransfer() {
  try {
    const operatorId = "0.0.7091243";
    const operatorKey = "0xd05d719c8517534454479bab488a66b23de7c3da1e4cee6e357c95ea381dce67";
    
    const accountId = AccountId.fromString(operatorId);
    const privateKey = PrivateKey.fromStringECDSA(operatorKey);
    
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);
    
    console.log("Creating test transaction...");
    console.log("Amount: 0.01 HBAR");
    console.log("From:", operatorId);
    console.log("To:", operatorId, "(self-transfer for testing)");
    
    const transaction = new TransferTransaction()
      .addHbarTransfer(accountId, new Hbar(-0.01))
      .addHbarTransfer(accountId, new Hbar(0.01))
      .setTransactionMemo("OfflinePay Test Transaction");
    
    console.log("\nExecuting transaction...");
    const txResponse = await transaction.execute(client);
    
    console.log("✅ Transaction submitted!");
    console.log("Transaction ID:", txResponse.transactionId.toString());
    
    console.log("\nWaiting for receipt...");
    const receipt = await txResponse.getReceipt(client);
    
    console.log("✅ Transaction Status:", receipt.status.toString());
    console.log("✅ Hedera transactions: WORKING");
    console.log("\nHashScan:", `https://hashscan.io/testnet/transaction/${txResponse.transactionId.toString()}`);
    
    client.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testTransfer();
