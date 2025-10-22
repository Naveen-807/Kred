import bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "./config/index.js";
import { connectToDatabase } from "./db/connection.js";
import { registerRoutes } from "./routes/index.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  try {
    await connectToDatabase();

    const app = express();

    app.use(helmet({
      contentSecurityPolicy: false, // Allow inline scripts for simulator
    }));
    app.use(cors());
    app.use(compression());
    app.use(morgan("combined"));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json({ limit: "1mb" }));

    // Serve Live Demo Dashboard (NEW - Professional UI for judges)
    app.get("/", (_req, res) => {
      res.sendFile(path.join(__dirname, "web", "index.html"));
    });

    // Old simulator still accessible
    app.get("/simulator", (_req, res) => {
      res.sendFile(path.join(__dirname, "web", "sms-simulator.html"));
    });

    registerRoutes(app);

    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error({ err }, "Unhandled error in request pipeline");
      res.status(500).json({ message: "Internal server error" });
    });

    app.listen(config.port, () => {
      logger.info(`OfflinePay backend listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to bootstrap server");
    process.exit(1);
  }
}

bootstrap();
