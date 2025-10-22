import express from "express";

import { logger } from "../utils/logger.js";

export const statusRouter = express.Router();

statusRouter.post("/", (req, res) => {
  logger.info({ status: req.body }, "Twilio status callback");
  res.status(204).end();
});
