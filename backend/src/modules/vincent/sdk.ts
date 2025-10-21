import { VincentSDK } from "@lit-protocol/vincent-sdk";

import { config } from "../../config/index.js";

let vincentSdk: VincentSDK | null = null;

export function getVincentSdk(): VincentSDK {
  if (!vincentSdk) {
    if (!config.vincent.appId || !config.vincent.delegateePrivateKey) {
      throw new Error("Vincent configuration missing");
    }

    vincentSdk = new VincentSDK({
      appId: config.vincent.appId,
      delegateePrivateKey: config.vincent.delegateePrivateKey,
      rpcUrl: config.vincent.rpcUrl
    });
  }

  return vincentSdk;
}
