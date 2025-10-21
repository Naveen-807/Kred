export type OtpEntryCommand = {
  type: "OTP_ENTRY";
  otp: string;
};

export type SetPinCommand = {
  type: "SET_PIN";
  pin: string;
};

export type PinEntryCommand = {
  type: "PIN_ENTRY";
  pin: string;
};

export type ResetCommand = {
  type: "RESET";
};

export type PayCommand = {
  type: "PAY";
  amount: number;
  currency: string;
  recipientPhone: string;
};

export type BalanceCommand = {
  type: "BALANCE";
};

export type SellCommand = {
  type: "SELL";
  amount: number;
  currency?: string;
};

export type HelpCommand = {
  type: "HELP";
};

export type StatusCommand = {
  type: "STATUS";
};

export type AcceptLoanCommand = {
  type: "ACCEPT_LOAN";
};

export type RetryCommand = {
  type: "RETRY";
  transactionId: string;
};

export type MerchantRegisterCommand = {
  type: "MERCHANT_REGISTER";
  name: string;
};

export type MerchantRequestPaymentCommand = {
  type: "MERCHANT_REQUEST_PAYMENT";
  amount: number;
  currency: string;
  customerPhone: string;
  note?: string;
};

export type MerchantReportCommand = {
  type: "MERCHANT_REPORT";
};

export type SavingsClubCreateCommand = {
  type: "CLUB_CREATE";
  name: string;
  members: string[];
};

export type SavingsClubDepositCommand = {
  type: "CLUB_DEPOSIT";
  clubName: string;
  amount: number;
};

export type SavingsClubProposePayoutCommand = {
  type: "CLUB_PROPOSE_PAYOUT";
  clubName: string;
  amount: number;
  recipientPhone: string;
};

export type SavingsClubVoteCommand = {
  type: "CLUB_VOTE";
  clubName: string;
  proposalId: string;
  vote: "YES" | "NO";
};

export type ParsedCommand =
  | PayCommand
  | BalanceCommand
  | SellCommand
  | HelpCommand
  | StatusCommand
  | AcceptLoanCommand
  | RetryCommand
  | MerchantRegisterCommand
  | MerchantRequestPaymentCommand
  | MerchantReportCommand
  | SavingsClubCreateCommand
  | SavingsClubDepositCommand
  | SavingsClubProposePayoutCommand
  | SavingsClubVoteCommand
  | SetPinCommand
  | PinEntryCommand
  | OtpEntryCommand
  | ResetCommand;
