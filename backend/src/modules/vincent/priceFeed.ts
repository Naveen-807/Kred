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
  if (!config.pyth.inrUsdPriceFeedId) {
    throw new Error("PYTH_INR_USD_FEED_ID not configured");
  }

  const conn = getConnection();
  const priceFeeds = await conn.getLatestPriceFeeds([
    config.pyth.inrUsdPriceFeedId
  ]);

  const feed = priceFeeds[0];
  if (!feed?.price?.price || feed.price.confidence === undefined) {
    throw new Error("Unable to fetch INR/USD price from Pyth");
  }

  const { price, expo } = feed.price;
  const normalized = price * 10 ** expo;

  if (normalized <= 0) {
    throw new Error("Invalid price received from Pyth");
  }

  return normalized;
}
