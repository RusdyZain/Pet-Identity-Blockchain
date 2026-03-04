import { authApi } from './apiClient';

const TX_POLL_INTERVAL_MS = 1_500;
const TX_TIMEOUT_MS = 120_000;
const TARGET_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 1337);
const TARGET_CHAIN_ID_HEX = `0x${TARGET_CHAIN_ID.toString(16)}`;
const TARGET_CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME ?? 'Ganache Local';
const TARGET_CHAIN_RPC_URL = import.meta.env.VITE_CHAIN_RPC_URL ?? 'http://127.0.0.1:7545';
const TARGET_CHAIN_CURRENCY_SYMBOL = import.meta.env.VITE_CHAIN_CURRENCY_SYMBOL ?? 'ETH';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getProvider = () => {
  if (!window.ethereum) {
    throw new Error('MetaMask tidak terdeteksi. Pasang extension MetaMask terlebih dahulu.');
  }
  return window.ethereum;
};

const ensureTargetChain = async () => {
  const provider = getProvider();
  const currentChainId = (await provider.request({
    method: 'eth_chainId',
  })) as string;

  if (currentChainId?.toLowerCase() === TARGET_CHAIN_ID_HEX.toLowerCase()) {
    return;
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: TARGET_CHAIN_ID_HEX }],
    });
  } catch (error: any) {
    if (error?.code !== 4902) {
      throw new Error(
        `Network wallet tidak sesuai. Pindahkan ke ${TARGET_CHAIN_NAME} (${TARGET_CHAIN_ID_HEX}).`,
      );
    }

    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: TARGET_CHAIN_ID_HEX,
          chainName: TARGET_CHAIN_NAME,
          rpcUrls: [TARGET_CHAIN_RPC_URL],
          nativeCurrency: {
            name: 'Ether',
            symbol: TARGET_CHAIN_CURRENCY_SYMBOL,
            decimals: 18,
          },
        },
      ],
    });

    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: TARGET_CHAIN_ID_HEX }],
    });
  }
};

export const connectWallet = async () => {
  const provider = getProvider();
  const accounts = (await provider.request({
    method: 'eth_requestAccounts',
  })) as string[];

  const [walletAddress] = accounts;
  if (!walletAddress) {
    throw new Error('Wallet address tidak ditemukan.');
  }

  return walletAddress;
};

export const signMessage = async (walletAddress: string, message: string) => {
  const provider = getProvider();
  const signature = (await provider.request({
    method: 'personal_sign',
    params: [message, walletAddress],
  })) as string;
  return signature;
};

export const signAuthChallenge = async (walletAddress: string) => {
  const challenge = await authApi.challenge(walletAddress);
  const signature = await signMessage(walletAddress, challenge.message);
  return {
    walletAddress,
    message: challenge.message,
    signature,
  };
};

export const waitForTransaction = async (
  txHash: string,
  options?: { timeoutMs?: number; pollIntervalMs?: number },
) => {
  const provider = getProvider();
  const timeoutMs = options?.timeoutMs ?? TX_TIMEOUT_MS;
  const pollIntervalMs = options?.pollIntervalMs ?? TX_POLL_INTERVAL_MS;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    });
    if (receipt && receipt.blockNumber) {
      return receipt;
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(`Transaksi ${txHash} belum terkonfirmasi sebelum timeout.`);
};

export const sendPreparedTransaction = async (txRequest: {
  to: string;
  data: string;
}) => {
  await ensureTargetChain();
  const provider = getProvider();
  const walletAddress = await connectWallet();
  const txHash = (await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: walletAddress,
        to: txRequest.to,
        data: txRequest.data,
      },
    ],
  })) as string;
  await waitForTransaction(txHash);
  return { txHash, walletAddress };
};
