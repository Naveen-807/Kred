import axios from "axios";

import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const { msg91 } = config.sms;

const MSG91_URL = "https://api.msg91.com/api/sendhttp.php";

export async function sendSms(to: string, message: string) {
  if (!msg91.authKey) {
    logger.warn({ to, message }, "MSG91 auth key missing; SMS send skipped");
    return { message: "MSG91 auth key missing" };
  }

  const normalizedPhone = normalizePhoneNumber(to, msg91.countryCode);

  try {
    const params = new URLSearchParams({
      authkey: msg91.authKey,
      sender: msg91.senderId,
      route: msg91.route,
      mobiles: normalizedPhone,
      country: msg91.countryCode,
      message
    });

    const response = await axios.post(MSG91_URL, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    logger.info({ to: normalizedPhone, response: response.data }, "MSG91 SMS sent");
    return response.data;
  } catch (error) {
    logger.error({ err: error, to: normalizedPhone, message }, "MSG91 SMS send failed");
    throw error;
  }
}

function normalizePhoneNumber(phone: string, defaultCountryCode: string) {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    return trimmed.replace(/[^0-9]/g, "");
  }

  const digits = trimmed.replace(/[^0-9]/g, "");
  if (digits.startsWith(defaultCountryCode)) {
    return digits;
  }

  return `${defaultCountryCode}${digits}`;
}

