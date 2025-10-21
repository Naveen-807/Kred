import mongoose from "mongoose";

import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export async function connectToDatabase(): Promise<typeof mongoose> {
  try {
    mongoose.set("strictQuery", true);
    const connection = await mongoose.connect(config.mongoUri, {
      autoIndex: config.env !== "production"
    });
    logger.info("Connected to MongoDB");
    return connection;
  } catch (error) {
    logger.error({ err: error }, "Failed to connect to MongoDB");
    throw error;
  }
}
