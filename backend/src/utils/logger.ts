import pino from "pino";

import { config } from "../config/index.js";

const level = config.env === "production" ? "info" : "debug";

export const logger = pino({
  level,
  transport:
    config.env === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname"
          }
        }
      : undefined
});
