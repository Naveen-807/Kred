export function formatToTokenDecimals(amount: number, decimals = 6): string {
  return BigInt(Math.round(amount * 10 ** decimals)).toString();
}

export function formatFromTokenDecimals(value: string, decimals = 6): number {
  return Number(value) / 10 ** decimals;
}

export function computePyusdFromFiat({
  amountFiat,
  fiatPriceUsd
}: {
  amountFiat: number;
  fiatPriceUsd: number;
}): number {
  if (fiatPriceUsd <= 0) {
    throw new Error("Invalid fiat price");
  }
  return amountFiat / fiatPriceUsd;
}
