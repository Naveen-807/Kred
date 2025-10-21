import twilio from "twilio";

import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const isTwilioConfigured = () =>
  Boolean(
    config.twilio.accountSid?.startsWith("AC") &&
      config.twilio.authToken &&
      config.twilio.phoneNumber
  );

export const twilioClient = isTwilioConfigured()
  ? twilio(config.twilio.accountSid, config.twilio.authToken)
  : {
      messages: {
        create: async ({ to, body }: { to: string; body: string }) => {
          logger.warn(
            { to, body },
            "Twilio not fully configured. SMS send simulated."
          );
          return {
            sid: `simulated-${Date.now()}`
          };
        }
      }
    };
