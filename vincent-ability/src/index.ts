interface AbilityParams {
  amount: string;
  recipientWallet: string;
  userWallet: string;
}

interface AbilityContext {
  env: Record<string, string>;
  abi: Record<string, unknown>;
  chainId: number;
  contractCall: (options: Record<string, unknown>) => unknown;
  invokeContract: (options: { calls: unknown[]; chainId: number }) => Promise<{ transactionHash: string }>;
}

export default {
  id: "aave-withdraw-and-send",
  name: "Aave Withdraw And Send",
  description: "Withdraw PYUSD from Aave and send to recipient",
  async execute({ params, context }: { params: AbilityParams; context: AbilityContext }) {
    const { amount, recipientWallet, userWallet } = params;
    if (!amount || !recipientWallet || !userWallet) {
      throw new Error("Missing parameters");
    }

    const withdrawCall = context.contractCall({
      contractAddress: context.env.AAVE_POOL_ADDRESS,
      abi: context.abi.aavePool,
      method: "withdraw",
      args: [context.env.PYUSD_ADDRESS, amount, userWallet]
    });

    const transferCall = context.contractCall({
      contractAddress: context.env.PYUSD_ADDRESS,
      abi: context.abi.erc20,
      method: "transfer",
      args: [recipientWallet, amount]
    });

    const tx = await context.invokeContract({
      calls: [withdrawCall, transferCall],
      chainId: context.chainId
    });

    return {
      transactionHash: tx.transactionHash
    };
  }
};
