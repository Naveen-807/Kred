import bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { config } from "./config/index.js";
import { connectToDatabase } from "./db/connection.js";
import { registerRoutes } from "./routes/index.js";
import { logger } from "./utils/logger.js";

async function bootstrap() {
  try {
    await connectToDatabase();

    const app = express();

    app.use(helmet());
    app.use(cors());
    app.use(compression());
    app.use(morgan("combined"));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json({ limit: "1mb" }));

    // Simple health check endpoint
    app.get("/", (_req, res) => {
      res.json({ 
        status: "ok", 
        service: "SMS Mobile API",
        timestamp: new Date().toISOString()
      });
    });

    registerRoutes(app);

    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error({ err }, "Unhandled error in request pipeline");
      res.status(500).json({ message: "Internal server error" });
    });

    app.listen(config.port, '0.0.0.0', () => {
      logger.info(`SMS Mobile API listening on port ${config.port} (accessible from network)`);
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to bootstrap server");
    process.exit(1);
  }
}

bootstrap();
