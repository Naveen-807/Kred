import axios from "axios";
import dotenv from "dotenv";
import { Wallet } from "ethers";

dotenv.config({ path: "./backend/env.example" });
dotenv.config();

async function registerAbility() {
  const {
    VINCENT_APP_ID,
    VINCENT_DELEGATEE_PRIVATE_KEY,
    VINCENT_ABILITY_CID,
  } = process.env;

  if (!VINCENT_APP_ID || !VINCENT_DELEGATEE_PRIVATE_KEY || !VINCENT_ABILITY_CID) {
    throw new Error("Missing Vincent credentials in env");
  }

  // 1. Prepare the request body
  const body = {
    appId: VINCENT_APP_ID,
    name: "Aave Withdraw And Send",
    description: "Withdraws PYUSD from Aave and sends it to a recipient.",
    artifactCid: VINCENT_ABILITY_CID,
  };

  // 2. Create a wallet from the private key to sign the request
  const wallet = new Wallet(VINCENT_DELEGATEE_PRIVATE_KEY);

  // 3. Sign the stringified request body
  // This proves you own the delegatee address associated with the app.
  const signature = await wallet.signMessage(JSON.stringify(body));

  // 4. Send the request with the signature in the headers
  const result = await axios.post(
    "https://api.vincent.litprotocol.com/abilities",
    body,
    {
      headers: {
        // The signature authenticates the request
        "x-lit-signature": signature,
        // The delegatee address is the public address corresponding to the private key
        "x-lit-delegatee": wallet.address,
      },
    }
  );

  console.log("Ability registered:", result.data);
}

registerAbility().catch((error) => {
  console.error(error.response?.data ?? error);
  process.exit(1);
});
