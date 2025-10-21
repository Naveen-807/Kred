export const HELP_TEXT = `📱 OfflinePay Command Guide

Basics:
- PAY [amount] INR to [phone]
- BALANCE
- SELL [amount]
- ACCEPT (loan offer)
- STATUS (account summary)
- HELP or MENU

Merchants:
- REGISTER MERCHANT [Store Name]
- REQUEST [amount] INR from [phone] for [note]
- REPORT (daily summary)

Savings Clubs:
- CREATE CLUB 'Name' with +91..., +91...
- CLUB DEPOSIT [amount] to 'Name'
- PROPOSE PAYOUT [amount] to +91...
- VOTE YES on [proposal-id] for 'Name'
`;

export const INVALID_COMMAND_HINTS = [
  "Try PAY 500 INR to +919876543210",
  "Text HELP to see all commands",
  "Use REPORT for merchant summaries",
  "Use PROPOSE PAYOUT 2500 to +91..."
];
