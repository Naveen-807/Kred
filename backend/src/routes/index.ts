import type { Express } from "express";

import { smsRouter } from "./sms.js";
import { statusRouter } from "./status.js";

export function registerRoutes(app: Express) {
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/webhook/sms", smsRouter);
  app.use("/webhook/status", statusRouter);
}
