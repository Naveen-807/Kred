export type UIStoredMessage = {
  message: string;
  timestamp: number;
  otp?: string;
  nextStep?: string;
  walletAddress?: string;
  inrUsdPrice?: number;
  txHash?: string;
  pythTxHash?: string;
  status?: string;
};

// In-memory store for the latest message per phone (1-minute TTL handled by readers)
const messageStore = new Map<string, UIStoredMessage>();

export function storeUIMessage(phone: string, message: string, otp?: string, nextStep?: string) {
  messageStore.set(phone, { message, timestamp: Date.now(), otp, nextStep });
}

export function getLastUIMessage(phone: string): UIStoredMessage | undefined {
  return messageStore.get(phone);
}

export function clearUIMessage(phone: string) {
  messageStore.delete(phone);
}

export function patchUIMessage(
  phone: string,
  patch: Partial<UIStoredMessage>
) {
  const current = messageStore.get(phone);
  if (!current) return;
  messageStore.set(phone, { ...current, ...patch, timestamp: Date.now() });
}

