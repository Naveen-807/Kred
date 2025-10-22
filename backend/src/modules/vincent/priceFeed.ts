import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";

import { config } from "../../config/index.js";

let connection: EvmPriceServiceConnection | null = null;

function getConnection(): EvmPriceServiceConnection {
  if (!connection) {
    connection = new EvmPriceServiceConnection("https://hermes.pyth.network");
  }
  return connection;
}

export async function getInrUsdPrice(): Promise<number> {
  try {
    if (!config.pyth.inrUsdPriceFeedId) {
      throw new Error("PYTH_INR_USD_FEED_ID not configured");
    }

    const conn = getConnection();
    
    // Add timeout to prevent hanging
    const priceFeeds = await Promise.race([
      conn.getLatestPriceFeeds([config.pyth.inrUsdPriceFeedId]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Pyth price feed timeout")), 5000)
      )
    ]) as any[];

    const feed = priceFeeds[0];
    if (!feed?.price?.price || feed.price.confidence === undefined) {
      throw new Error("Unable to fetch INR/USD price from Pyth");
    }

    const { price, expo } = feed.price;
    const normalized = Number(price) * Math.pow(10, expo);

    if (normalized <= 0 || isNaN(normalized)) {
      throw new Error("Invalid price received from Pyth");
    }

    return normalized;
  } catch (error) {
    // Fallback to approximate rate if Pyth unavailable
    const fallbackRate = 0.012; // 1 INR ≈ 0.012 USD (83 INR per USD)
    console.warn("Pyth price feed unavailable, using fallback rate:", fallbackRate);
    return fallbackRate;
  }
}
