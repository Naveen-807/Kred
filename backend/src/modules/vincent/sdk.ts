import { getVincentToolClient } from "@lit-protocol/vincent-sdk";
import type { VincentToolClient } from "@lit-protocol/vincent-sdk";

import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

let vincentClient: VincentToolClient | null = null;

export function getVincentSdk(): VincentToolClient {
  if (!vincentClient) {
    if (!config.vincent.appId) {
      throw new Error("Vincent App ID missing in configuration");
    }

    try {
      vincentClient = getVincentToolClient({
        appId: config.vincent.appId,
      });
      logger.info({ appId: config.vincent.appId }, "Vincent client initialized");
    } catch (error) {
      logger.error({ err: error }, "Failed to initialize Vincent client");
      throw error;
    }
  }

  return vincentClient;
}
