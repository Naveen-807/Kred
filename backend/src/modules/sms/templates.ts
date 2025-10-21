export const templates = {
  welcome: () =>
    "Welcome to OfflinePay! Reply with SET PIN 1234 to secure your wallet.",
  pinSetSuccess: () =>
    "Your PIN is set. Send HELP anytime to see payment commands.",
  pinReminder: () => "Please enter your 4-digit PIN to continue.",
  otp: (otp: string) => `Your OfflinePay OTP is ${otp}. Valid for 5 minutes.`,
  otpExpired: () =>
    "Your OTP expired. Send your command again to receive a new OTP.",
  payConfirmation: (
    amountFiat: number,
    currency: string,
    _pyusd: number,
    recipient: string,
    hash: string,
    balance: number
  ) =>
    `✓ Simulated payment of ${amountFiat.toFixed(2)} ${currency} to ${recipient}\nConfirmation: ${hash}\nBalance: ${balance.toFixed(
      2
    )} PYUSD`,
  balance: (pyusd: number, fiatEquivalent: number, currency: string) =>
    `Balance: ${pyusd.toFixed(2)} PYUSD (~${fiatEquivalent.toFixed(
      2
    )} ${currency})`,
  loanOffer: (amount: number) =>
    `Congratulations! You're pre-approved for a ${amount} PYUSD micro-loan. Reply ACCEPT to receive funds instantly.`,
  loanSuccess: (amount: number) => `${amount} PYUSD loan deposited to your wallet.`,
  sellConfirmation: (amount: number, currency: string) =>
    `Sell request received for ${amount} PYUSD. ${currency} will reach your bank shortly.`,
  help: () =>
    "Commands: PAY 100 INR to +91XXXXXXXXXX, BALANCE, STATUS, HELP, RESET",
  invalidCommand: (hint: string) =>
    `We couldn't understand that. ${hint} Reply HELP for full list.`,
  otpRequest: () => "Please reply with your 4-digit PIN to confirm.",
  pinPrompt: () => "Enter your 4-digit PIN to continue.",
  pinIncorrect: (attemptsLeft: number) =>
    `Incorrect PIN. ${attemptsLeft} attempts left before lockout.`,
  accountLocked: () =>
    "Too many failed attempts. Reply RESET to regain access.",
  merchantPaymentRequest: (
    merchant: string,
    amount: number,
    currency: string,
    note?: string
  ) =>
    `${merchant} requests ${amount} ${currency}${
      note ? ` for ${note}` : ""
    }. Reply PAY ${amount} ${currency} to confirm.`,
  merchantReport: (
    merchant: string,
    totalSales: number,
    currency: string,
    transactions: number,
    pyusdBalance: number
  ) =>
    `${merchant} Daily Report\nSales: ${totalSales.toFixed(2)} ${currency}\nTx: ${transactions}\nPYUSD Balance: ${pyusdBalance.toFixed(2)}`,
  savingsClubCreated: (name: string, members: number) =>
    `Savings Club '${name}' created with ${members} members.`,
  savingsClubDeposit: (name: string, amount: number) =>
    `Deposited ${amount} PYUSD to '${name}'.`,
  savingsClubProposal: (
    name: string,
    amount: number,
    recipient: string,
    proposalId: string
  ) =>
    `PAYOUT Proposal for '${name}': ${amount} PYUSD to ${recipient}. Reply VOTE YES on ${proposalId} for '${name}' or VOTE NO...`,
  savingsClubVoteRecorded: (name: string, vote: "YES" | "NO") =>
    `Your vote '${vote}' for '${name}' is recorded.`,
  savingsClubPayoutExecuted: (name: string, amount: number, recipient: string) =>
    `Payout of ${amount} PYUSD to ${recipient} from '${name}' executed.`,
  retryPrompt: (transactionId: string) =>
    `Transaction pending. Reply RETRY ${transactionId} to check status.`,
  statusSummary: (
    wallet: string,
    pyusd: number,
    sbtCount: number,
    yieldEarned: number
  ) =>
    `Wallet: ${wallet}\nPYUSD: ${pyusd.toFixed(2)}\nSBTs: ${sbtCount}\nYield Earned: ${yieldEarned.toFixed(2)} PYUSD`
};
