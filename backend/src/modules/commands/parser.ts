import { parsePhoneNumber } from "libphonenumber-js";
import { z } from "zod";

import {
  AcceptLoanCommand,
  BalanceCommand,
  HelpCommand,
  MerchantRegisterCommand,
  MerchantReportCommand,
  MerchantRequestPaymentCommand,
  ParsedCommand,
  PayCommand,
  PinEntryCommand,
  ResetCommand,
  RetryCommand,
  SavingsClubCreateCommand,
  SavingsClubDepositCommand,
  SavingsClubProposePayoutCommand,
  SavingsClubVoteCommand,
  SellCommand,
  SetPinCommand,
  StatusCommand,
  OtpEntryCommand
} from "./commandTypes.js";

const amountSchema = z.number().positive();

const parseAmount = (value: string): number => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) {
    throw new Error("Invalid amount");
  }
  const amount = Number.parseFloat(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be positive number");
  }
  return amount;
};

const normalizeCurrency = (value: string): string => value.toUpperCase();

const normalizePhoneNumber = (value: string): string => {
  try {
    const phone = parsePhoneNumber(value, { defaultCountry: "IN" });
    if (!phone.isValid()) {
      throw new Error("Invalid phone number");
    }
    return phone.number;
  } catch (error) {
    throw new Error(`Invalid phone number: ${(error as Error).message}`);
  }
};

const PAY_REGEX = /^PAY\s+(?<amount>\d+(?:\.\d{1,2})?)\s*(?<currency>[A-Za-z]{3})?\s+to\s+(?<phone>\S+)(?:\s+for\s+(?<note>.+))?$/i;
const SELL_REGEX = /^SELL\s+(?<amount>\d+(?:\.\d{1,2})?)(?:\s+(?<currency>[A-Za-z]{3}))?$/i;
const MERCHANT_REGISTER_REGEX = /^REGISTER\s+MERCHANT\s+(?<name>.+)$/i;
const MERCHANT_REQUEST_REGEX = /^REQUEST\s+(?<amount>\d+(?:\.\d{1,2})?)\s*(?<currency>[A-Za-z]{3})?\s+from\s+(?<phone>\S+)(?:\s+for\s+(?<note>.+))?$/i;
const CLUB_CREATE_REGEX = /^CREATE\s+CLUB\s+'?(?<name>[\w\s-]+)'?\s+with\s+(?<members>.+)$/i;
const CLUB_DEPOSIT_REGEX = /^CLUB\s+DEPOSIT\s+(?<amount>\d+(?:\.\d{1,2})?)\s+to\s+'?(?<name>[\w\s-]+)'?$/i;
const CLUB_PROPOSE_REGEX = /^PROPOSE\s+PAYOUT\s+(?<amount>\d+(?:\.\d{1,2})?)\s+to\s+(?<phone>\S+)\s+from\s+'?(?<name>[\w\s-]+)'?$/i;
const CLUB_VOTE_REGEX = /^VOTE\s+(?<vote>YES|NO)\s+on\s+(?<proposalId>[A-Za-z0-9-]+)\s+for\s+'?(?<name>[\w\s-]+)'?$/i;
const RETRY_REGEX = /^RETRY\s+(?<transactionId>[A-Za-z0-9-]+)$/i;

const OTP_ENTRY_REGEX = /^OTP\s+(?<otp>\d{6})$/i;
const SET_PIN_REGEX = /^SET\s+PIN\s+(?<pin>\d{4})$/i;
const PIN_ENTRY_REGEX = /^(?<pin>\d{4})$/;
const RESET_PATTERN = /^RESET$/i;

const HELP_PATTERN = /^(HELP|MENU)$/i;
const BALANCE_PATTERN = /^BALANCE$/i;
const STATUS_PATTERN = /^STATUS$/i;
const ACCEPT_PATTERN = /^ACCEPT$/i;
const MERCHANT_REPORT_PATTERN = /^REPORT$/i;

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  if (RESET_PATTERN.test(trimmed)) {
    const command: ResetCommand = { type: "RESET" };
    return command;
  }

  const setPinMatch = trimmed.match(SET_PIN_REGEX);
  if (setPinMatch?.groups?.pin) {
    const command: SetPinCommand = {
      type: "SET_PIN",
      pin: setPinMatch.groups.pin
    };
    return command;
  }

  const otpMatch = trimmed.match(OTP_ENTRY_REGEX);
  if (otpMatch?.groups?.otp) {
    const command: OtpEntryCommand = {
      type: "OTP_ENTRY",
      otp: otpMatch.groups.otp
    };
    return command;
  }

  const pinEntryMatch = trimmed.match(PIN_ENTRY_REGEX);
  if (pinEntryMatch?.groups?.pin) {
    const command: PinEntryCommand = {
      type: "PIN_ENTRY",
      pin: pinEntryMatch.groups.pin
    };
    return command;
  }

  if (HELP_PATTERN.test(trimmed)) {
    const command: HelpCommand = { type: "HELP" };
    return command;
  }

  if (BALANCE_PATTERN.test(trimmed)) {
    const command: BalanceCommand = { type: "BALANCE" };
    return command;
  }

  if (STATUS_PATTERN.test(trimmed)) {
    const command: StatusCommand = { type: "STATUS" };
    return command;
  }

  if (ACCEPT_PATTERN.test(trimmed)) {
    const command: AcceptLoanCommand = { type: "ACCEPT_LOAN" };
    return command;
  }

  if (MERCHANT_REPORT_PATTERN.test(trimmed)) {
    const command: MerchantReportCommand = { type: "MERCHANT_REPORT" };
    return command;
  }

  const payMatch = trimmed.match(PAY_REGEX);
  if (payMatch?.groups) {
    const amount = amountSchema.parse(parseAmount(payMatch.groups.amount));
    const currency = normalizeCurrency(payMatch.groups.currency ?? "INR");
    const recipientPhone = normalizePhoneNumber(payMatch.groups.phone);

    const command: PayCommand = {
      type: "PAY",
      amount,
      currency,
      recipientPhone
    };
    return command;
  }

  const sellMatch = trimmed.match(SELL_REGEX);
  if (sellMatch?.groups) {
    const amount = amountSchema.parse(parseAmount(sellMatch.groups.amount));
    const currency = normalizeCurrency(sellMatch.groups.currency ?? "PYUSD");

    const command: SellCommand = {
      type: "SELL",
      amount,
      currency
    };
    return command;
  }

  const registerMatch = trimmed.match(MERCHANT_REGISTER_REGEX);
  if (registerMatch?.groups?.name) {
    const command: MerchantRegisterCommand = {
      type: "MERCHANT_REGISTER",
      name: registerMatch.groups.name.trim()
    };
    return command;
  }

  const merchantRequestMatch = trimmed.match(MERCHANT_REQUEST_REGEX);
  if (merchantRequestMatch?.groups) {
    const amount = amountSchema.parse(parseAmount(merchantRequestMatch.groups.amount));
    const currency = normalizeCurrency(
      merchantRequestMatch.groups.currency ?? "INR"
    );
    const customerPhone = normalizePhoneNumber(merchantRequestMatch.groups.phone);

    const command: MerchantRequestPaymentCommand = {
      type: "MERCHANT_REQUEST_PAYMENT",
      amount,
      currency,
      customerPhone,
      note: merchantRequestMatch.groups.note?.trim()
    };
    return command;
  }

  const clubCreateMatch = trimmed.match(CLUB_CREATE_REGEX);
  if (clubCreateMatch?.groups) {
    const members = clubCreateMatch.groups.members
      .split(/[\s,]+/)
      .map((value) => normalizePhoneNumber(value))
      .filter(Boolean);

    if (members.length < 2) {
      throw new Error("A club needs at least two members");
    }

    const command: SavingsClubCreateCommand = {
      type: "CLUB_CREATE",
      name: clubCreateMatch.groups.name.trim(),
      members
    };
    return command;
  }

  const clubDepositMatch = trimmed.match(CLUB_DEPOSIT_REGEX);
  if (clubDepositMatch?.groups) {
    const amount = amountSchema.parse(parseAmount(clubDepositMatch.groups.amount));

    const command: SavingsClubDepositCommand = {
      type: "CLUB_DEPOSIT",
      clubName: clubDepositMatch.groups.name.trim(),
      amount
    };
    return command;
  }

  const clubProposeMatch = trimmed.match(CLUB_PROPOSE_REGEX);
  if (clubProposeMatch?.groups) {
    const amount = amountSchema.parse(parseAmount(clubProposeMatch.groups.amount));
    const command: SavingsClubProposePayoutCommand = {
      type: "CLUB_PROPOSE_PAYOUT",
      clubName: clubProposeMatch.groups.name.trim(),
      amount,
      recipientPhone: normalizePhoneNumber(clubProposeMatch.groups.phone)
    };
    return command;
  }

  const clubVoteMatch = trimmed.match(CLUB_VOTE_REGEX);
  if (clubVoteMatch?.groups) {
    const command: SavingsClubVoteCommand = {
      type: "CLUB_VOTE",
      clubName: clubVoteMatch.groups.name.trim(),
      proposalId: clubVoteMatch.groups.proposalId,
      vote: clubVoteMatch.groups.vote as "YES" | "NO"
    };
    return command;
  }

  const retryMatch = trimmed.match(RETRY_REGEX);
  if (retryMatch?.groups?.transactionId) {
    const command: RetryCommand = {
      type: "RETRY",
      transactionId: retryMatch.groups.transactionId
    };
    return command;
  }

  throw new Error("We couldn't understand that command. Reply HELP for options.");
}
