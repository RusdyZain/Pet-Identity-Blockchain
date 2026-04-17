import http from 'k6/http';
import { check, sleep } from 'k6';
import { Wallet } from '../vendor/ethers.bundle.mjs';

import { ENV, getWalletByAddress } from './env.js';
import {
  nonceConflictCount,
  rpcErrorRate,
  txConfirmMs,
  txSubmitMs,
} from './metrics.js';
import { hexToBigInt, toHexNumber, utf8ToHex } from './utils.js';

let rpcRequestId = 1;
let cachedChainIdHex = null;
let cachedChainIdNumber = null;
let cachedSignMethod = null;

const nonceCache = new Map();
const signerCache = new Map();

const NONCE_ERROR_PATTERNS = [
  'nonce too low',
  'already known',
  'nonce has already been used',
  'replacement transaction underpriced',
  'known transaction',
];

export const isNonceConflictMessage = (message) => {
  const lower = `${message ?? ''}`.toLowerCase();
  return NONCE_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
};

const buildRpcPayload = (method, params) =>
  JSON.stringify({
    jsonrpc: '2.0',
    id: rpcRequestId++,
    method,
    params,
  });

export const rpcCall = (method, params = [], tags = {}, options = {}) => {
  const { countErrorSample = true } = options;

  const requestTags = {
    component: 'rpc',
    rpc_method: method,
    ...(tags || {}),
  };

  const response = http.post(ENV.rpcUrl, buildRpcPayload(method, params), {
    headers: { 'Content-Type': 'application/json' },
    tags: requestTags,
  });

  const isHttpOk = check(
    response,
    {
      [`rpc ${method} status is 200`]: (res) => res.status === 200,
    },
    requestTags
  );

  if (!isHttpOk) {
    if (countErrorSample) {
      rpcErrorRate.add(1, requestTags);
    }
    throw new Error(`RPC ${method} failed with HTTP ${response.status}`);
  }

  let body;
  try {
    body = response.json();
  } catch (_error) {
    if (countErrorSample) {
      rpcErrorRate.add(1, requestTags);
    }
    throw new Error(`RPC ${method} returned non-JSON response`);
  }

  if (body.error) {
    const message = `${body.error.code ?? ''} ${body.error.message ?? ''}`.trim();

    if (countErrorSample) {
      rpcErrorRate.add(1, requestTags);
    }

    if (isNonceConflictMessage(message)) {
      nonceConflictCount.add(1, requestTags);
    }

    if (ENV.logRpcErrors) {
      console.error(`[rpc:${method}] ${message}`);
    }

    throw new Error(`RPC ${method} error: ${message}`);
  }

  if (countErrorSample) {
    rpcErrorRate.add(0, requestTags);
  }

  return body.result;
};

const getChainIdHex = (tags = {}) => {
  if (ENV.chainId > 0) {
    return toHexNumber(ENV.chainId);
  }

  if (cachedChainIdHex) {
    return cachedChainIdHex;
  }

  cachedChainIdHex = rpcCall('eth_chainId', [], tags);
  return cachedChainIdHex;
};

const getChainIdNumber = (tags = {}) => {
  if (ENV.chainId > 0) {
    return ENV.chainId;
  }

  if (cachedChainIdNumber !== null) {
    return cachedChainIdNumber;
  }

  const chainIdHex = getChainIdHex(tags);
  const chainIdBigInt = hexToBigInt(chainIdHex);
  if (chainIdBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Chain ID too large for signer: ${chainIdHex}`);
  }

  cachedChainIdNumber = Number(chainIdBigInt);
  return cachedChainIdNumber;
};

const resetNonceCache = (walletAddress) => {
  nonceCache.delete(walletAddress.toLowerCase());
};

const getNextNonce = (walletAddress, tags = {}) => {
  const key = walletAddress.toLowerCase();
  const chainNonceHex = rpcCall(
    'eth_getTransactionCount',
    [walletAddress, 'pending'],
    { ...tags, step: 'nonce-pending' }
  );
  const chainNonce = hexToBigInt(chainNonceHex);

  const cachedNonce = nonceCache.get(key);
  const nextNonce = cachedNonce === undefined ? chainNonce : chainNonce > cachedNonce ? chainNonce : cachedNonce;

  nonceCache.set(key, nextNonce + 1n);
  return nextNonce;
};

const getFeeConfig = (tags = {}) => {
  if (!ENV.useEip1559) {
    return {
      gasPrice: rpcCall('eth_gasPrice', [], { ...tags, step: 'gas-price' }),
    };
  }

  const latestBlock = rpcCall(
    'eth_getBlockByNumber',
    ['latest', false],
    { ...tags, step: 'latest-block' }
  );

  const baseFeeHex = latestBlock?.baseFeePerGas;
  if (!baseFeeHex) {
    return {
      gasPrice: rpcCall('eth_gasPrice', [], { ...tags, step: 'gas-price-fallback' }),
    };
  }

  const baseFee = hexToBigInt(baseFeeHex);
  const priorityFee = BigInt(Math.floor(ENV.maxPriorityFeeGwei * 1_000_000_000));
  const maxFee = baseFee * BigInt(ENV.maxFeeMultiplier) + priorityFee;

  return {
    maxPriorityFeePerGas: toHexNumber(priorityFee),
    maxFeePerGas: toHexNumber(maxFee),
  };
};

const toSafeNonceNumber = (nonce) => {
  if (nonce > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Nonce too large for signer runtime: ${nonce.toString()}`);
  }
  return Number(nonce);
};

const buildTxPayload = ({ walletAddress, txRequest, nonce, tags }) => {
  const baseTx = {
    from: walletAddress,
    to: txRequest.to,
    data: txRequest.data,
    value: '0x0',
    gas: toHexNumber(ENV.txGasLimit),
    nonce: toHexNumber(nonce),
    chainId: getChainIdHex(tags),
  };

  return {
    ...baseTx,
    ...getFeeConfig(tags),
  };
};

const buildUnsignedTx = ({ txRequest, nonce, tags }) => {
  const feeConfig = getFeeConfig(tags);
  const baseTx = {
    to: txRequest.to,
    data: txRequest.data,
    value: 0,
    nonce: toSafeNonceNumber(nonce),
    gasLimit: BigInt(ENV.txGasLimit),
    chainId: getChainIdNumber(tags),
  };

  if (feeConfig.maxFeePerGas && feeConfig.maxPriorityFeePerGas) {
    return {
      ...baseTx,
      type: 2,
      maxFeePerGas: hexToBigInt(feeConfig.maxFeePerGas),
      maxPriorityFeePerGas: hexToBigInt(feeConfig.maxPriorityFeePerGas),
    };
  }

  return {
    ...baseTx,
    type: 0,
    gasPrice: hexToBigInt(feeConfig.gasPrice),
  };
};

const isSuccessfulReceipt = (receipt) => {
  if (!receipt) {
    return false;
  }

  if (receipt.status === '0x1' || receipt.status === 1) {
    return true;
  }

  return false;
};

export const waitForReceipt = (txHash, tags = {}) => {
  const deadline = Date.now() + ENV.txTimeoutMs;

  while (Date.now() < deadline) {
    const receipt = rpcCall(
      'eth_getTransactionReceipt',
      [txHash],
      { ...tags, step: 'tx-receipt-poll' }
    );

    if (receipt && receipt.blockNumber) {
      return receipt;
    }

    sleep(ENV.txPollIntervalMs / 1000);
  }

  throw new Error(`Timeout waiting tx receipt for ${txHash}`);
};

const getLocalSignerByAddress = (walletAddress) => {
  const key = `${walletAddress}`.toLowerCase();
  if (signerCache.has(key)) {
    return signerCache.get(key);
  }

  const wallet = getWalletByAddress(walletAddress);
  if (!wallet?.privateKey) {
    throw new Error(
      `Missing private key for wallet ${walletAddress}. ` +
        `Set OWNER_PRIVATE_KEYS / CLINIC_PRIVATE_KEYS and keep mapping aligned.`
    );
  }

  const signer = new Wallet(wallet.privateKey);
  if (signer.address.toLowerCase() !== key) {
    throw new Error(
      `Private key/address mismatch for ${walletAddress}. Derived=${signer.address}`
    );
  }

  signerCache.set(key, signer);
  return signer;
};

const submitRawTransaction = async ({ walletAddress, txRequest, nonce, tags }) => {
  const signer = getLocalSignerByAddress(walletAddress);
  const unsignedTx = buildUnsignedTx({ txRequest, nonce, tags });

  let signedRawTx;
  try {
    signedRawTx = await signer.signTransaction(unsignedTx);
  } catch (error) {
    throw new Error(`Failed to sign tx for ${walletAddress}: ${error?.message ?? error}`);
  }

  return rpcCall(
    'eth_sendRawTransaction',
    [signedRawTx],
    { ...tags, step: 'tx-submit-raw' }
  );
};

export const sendPreparedTransaction = async ({ walletAddress, txRequest, tags = {} }) => {
  if (!txRequest || !txRequest.to || !txRequest.data) {
    throw new Error('Invalid txRequest payload: missing to/data');
  }

  let lastError = null;

  for (let attempt = 1; attempt <= ENV.txMaxRetries; attempt += 1) {
    const nonce = getNextNonce(walletAddress, tags);
    const submitStart = Date.now();

    try {
      const txHash =
        ENV.signerMode === 'local_private_key'
          ? await submitRawTransaction({
              walletAddress,
              txRequest,
              nonce,
              tags: { ...tags, signer_mode: ENV.signerMode },
            })
          : rpcCall(
              'eth_sendTransaction',
              [buildTxPayload({ walletAddress, txRequest, nonce, tags })],
              { ...tags, step: 'tx-submit', signer_mode: ENV.signerMode }
            );

      txSubmitMs.add(Date.now() - submitStart, tags);

      const confirmStart = Date.now();
      const receipt = waitForReceipt(txHash, tags);
      txConfirmMs.add(Date.now() - confirmStart, tags);

      if (!isSuccessfulReceipt(receipt)) {
        throw new Error(`On-chain tx failed (status=${receipt?.status}) hash=${txHash}`);
      }

      return txHash;
    } catch (error) {
      txSubmitMs.add(Date.now() - submitStart, tags);
      lastError = error;

      if (isNonceConflictMessage(error?.message)) {
        resetNonceCache(walletAddress);
      }

      if (attempt < ENV.txMaxRetries && isNonceConflictMessage(error?.message)) {
        sleep(0.2 * attempt);
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error('Failed to submit transaction');
};

const trySignWith = (method, walletAddress, messageHex, tags = {}) =>
  rpcCall(method, [messageHex, walletAddress], tags, { countErrorSample: false });

const trySignWithSwappedParams = (method, walletAddress, messageHex, tags = {}) =>
  rpcCall(method, [walletAddress, messageHex], tags, { countErrorSample: false });

export const signMessageWithRpc = (walletAddress, message, tags = {}) => {
  const messageHex = utf8ToHex(message);

  if (cachedSignMethod === 'personal_sign') {
    return trySignWith('personal_sign', walletAddress, messageHex, tags);
  }
  if (cachedSignMethod === 'personal_sign_swapped') {
    return trySignWithSwappedParams('personal_sign', walletAddress, messageHex, tags);
  }
  if (cachedSignMethod === 'eth_sign') {
    return trySignWithSwappedParams('eth_sign', walletAddress, messageHex, tags);
  }

  try {
    const signature = trySignWith('personal_sign', walletAddress, messageHex, tags);
    cachedSignMethod = 'personal_sign';
    return signature;
  } catch (_error) {
    // Continue to fallback signature methods.
  }

  try {
    const signature = trySignWithSwappedParams('personal_sign', walletAddress, messageHex, tags);
    cachedSignMethod = 'personal_sign_swapped';
    return signature;
  } catch (_error) {
    // Continue to fallback signature methods.
  }

  try {
    const signature = trySignWithSwappedParams('eth_sign', walletAddress, messageHex, tags);
    cachedSignMethod = 'eth_sign';
    return signature;
  } catch (error) {
    throw new Error(
      `Cannot sign wallet challenge for ${walletAddress}. ` +
        `RPC must expose unlocked wallet signing (personal_sign/eth_sign). Root error: ${error?.message}`
    );
  }
};

export const signMessage = (walletAddress, message, tags = {}) => {
  if (ENV.signerMode === 'local_private_key') {
    const signer = getLocalSignerByAddress(walletAddress);

    try {
      return signer.signMessageSync(message);
    } catch (error) {
      throw new Error(
        `Cannot sign wallet challenge with local private key (${walletAddress}): ` +
          `${error?.message ?? error}`
      );
    }
  }

  return signMessageWithRpc(walletAddress, message, tags);
};

export const listUnlockedWallets = (tags = {}) =>
  rpcCall('eth_accounts', [], { ...tags, step: 'wallet-list' }, { countErrorSample: false });

export const readChainId = (tags = {}) => getChainIdHex(tags);
