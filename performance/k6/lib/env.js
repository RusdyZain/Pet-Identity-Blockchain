import { Wallet } from '../vendor/ethers.bundle.mjs';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const PRIVATE_KEY_REGEX = /^(0x)?[a-fA-F0-9]{64}$/;
const SIGNER_MODES = ['auto', 'rpc_unlocked', 'local_private_key'];

const parseCsv = (raw) =>
  `${raw ?? ''}`
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const parseInteger = (name, fallback, min = null) => {
  const raw = __ENV[name];
  if (raw === undefined || raw === null || `${raw}`.trim().length === 0) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`Invalid integer env ${name}: ${raw}`);
  }

  if (min !== null && value < min) {
    throw new Error(`Env ${name} must be >= ${min}. Got: ${value}`);
  }

  return value;
};

const parseNumber = (name, fallback, min = null) => {
  const raw = __ENV[name];
  if (raw === undefined || raw === null || `${raw}`.trim().length === 0) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric env ${name}: ${raw}`);
  }

  if (min !== null && value < min) {
    throw new Error(`Env ${name} must be >= ${min}. Got: ${value}`);
  }

  return value;
};

const parseBoolean = (name, fallback) => {
  const raw = __ENV[name];
  if (raw === undefined || raw === null || `${raw}`.trim().length === 0) {
    return fallback;
  }

  const normalized = `${raw}`.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean env ${name}: ${raw}`);
};

const parseSignerMode = () => {
  const raw = `${__ENV.SIGNER_MODE ?? 'auto'}`.trim().toLowerCase();
  if (!SIGNER_MODES.includes(raw)) {
    throw new Error(`Invalid SIGNER_MODE: ${raw}. Allowed: ${SIGNER_MODES.join(', ')}`);
  }
  return raw;
};

const validateAddress = (address, label) => {
  if (!ADDRESS_REGEX.test(address)) {
    throw new Error(`Invalid wallet address in ${label}: ${address}`);
  }
  return address;
};

const normalizePrivateKey = (privateKey, label) => {
  const normalized = `${privateKey}`.trim();
  if (!PRIVATE_KEY_REGEX.test(normalized)) {
    throw new Error(`Invalid private key in ${label}. Expect 32-byte hex.`);
  }
  return normalized.startsWith('0x') ? normalized : `0x${normalized}`;
};

const deriveAddressFromPrivateKey = (privateKey, label) => {
  try {
    return new Wallet(privateKey).address;
  } catch (error) {
    throw new Error(`Cannot derive wallet address from ${label}: ${error?.message ?? error}`);
  }
};

const resolveWalletAddress = ({ role, index, privateKey, explicitAddress }) => {
  if (!privateKey && explicitAddress) {
    return explicitAddress;
  }

  if (!privateKey && !explicitAddress) {
    throw new Error(
      `${role} wallet #${index + 1} missing address. ` +
        `Set ${role}_WALLET_ADDRESSES / ${role}_ADDRESSES.`
    );
  }

  const derivedAddress = deriveAddressFromPrivateKey(privateKey, `${role}_PRIVATE_KEYS`);
  if (!explicitAddress) {
    return derivedAddress;
  }

  if (derivedAddress.toLowerCase() !== explicitAddress.toLowerCase()) {
    throw new Error(
      `${role} wallet #${index + 1} address mismatch. ` +
        `Provided address=${explicitAddress}, derived=${derivedAddress}`
    );
  }

  return explicitAddress;
};

const buildWalletEntries = (role, options) => {
  const {
    addressesRaw,
    privateKeysRaw,
    emailsRaw,
    signerMode,
  } = options;

  const addresses = parseCsv(addressesRaw).map((address) =>
    validateAddress(address, `${role}_WALLET_ADDRESSES`)
  );
  const privateKeys = parseCsv(privateKeysRaw).map((key) =>
    normalizePrivateKey(key, `${role}_PRIVATE_KEYS`)
  );
  const emails = parseCsv(emailsRaw);

  if (signerMode === 'rpc_unlocked' && addresses.length === 0) {
    throw new Error(
      `${role} wallet pool is empty for rpc_unlocked mode. ` +
        `Set ${role}_WALLET_ADDRESSES or ${role}_ADDRESSES.`
    );
  }

  if (signerMode === 'local_private_key' && privateKeys.length === 0) {
    throw new Error(
      `${role} private key pool is empty for local_private_key mode. ` +
        `Set ${role}_PRIVATE_KEYS.`
    );
  }

  if (addresses.length > 0 && privateKeys.length > 0 && addresses.length !== privateKeys.length) {
    throw new Error(
      `${role} wallet count mismatch. ` +
        `Addresses=${addresses.length}, PrivateKeys=${privateKeys.length}. ` +
        `Provide equal count or omit addresses to auto-derive.`
    );
  }

  const walletCount = Math.max(addresses.length, privateKeys.length);
  if (walletCount === 0) {
    return [];
  }

  return Array.from({ length: walletCount }, (_unused, index) => {
    const explicitAddress = addresses[index] ?? null;
    const privateKey = privateKeys[index] ?? null;
    const address = resolveWalletAddress({
      role,
      index,
      privateKey,
      explicitAddress,
    });

    const suffix = address.slice(-8).toLowerCase();
    const defaultEmail = `${role.toLowerCase()}_${suffix}@k6.local`;

    return {
      address,
      email: emails[index] ?? defaultEmail,
      privateKey,
    };
  });
};

const rawSignerMode = parseSignerMode();
const hasAnyPrivateKeyPool =
  parseCsv(__ENV.OWNER_PRIVATE_KEYS).length > 0 ||
  parseCsv(__ENV.CLINIC_PRIVATE_KEYS).length > 0;

const signerMode = rawSignerMode === 'auto'
  ? hasAnyPrivateKeyPool
    ? 'local_private_key'
    : 'rpc_unlocked'
  : rawSignerMode;

const ownerWallets = buildWalletEntries('OWNER', {
  addressesRaw: __ENV.OWNER_WALLET_ADDRESSES ?? __ENV.OWNER_ADDRESSES,
  privateKeysRaw: __ENV.OWNER_PRIVATE_KEYS,
  emailsRaw: __ENV.OWNER_WALLET_EMAILS,
  signerMode,
});

const clinicWallets = buildWalletEntries('CLINIC', {
  addressesRaw: __ENV.CLINIC_WALLET_ADDRESSES ?? __ENV.CLINIC_ADDRESSES,
  privateKeysRaw: __ENV.CLINIC_PRIVATE_KEYS,
  emailsRaw: __ENV.CLINIC_WALLET_EMAILS,
  signerMode,
});

const walletLookup = new Map();
for (const wallet of [...ownerWallets, ...clinicWallets]) {
  const key = wallet.address.toLowerCase();
  const existing = walletLookup.get(key);

  if (existing && existing.privateKey && wallet.privateKey && existing.privateKey !== wallet.privateKey) {
    throw new Error(
      `Duplicate wallet address ${wallet.address} configured with different private keys.`
    );
  }

  if (!existing) {
    walletLookup.set(key, wallet);
  }
}

const defaultOwnerSecondaryOffset = Math.max(1, Math.floor(ownerWallets.length / 2) || 1);

export const ENV = {
  apiUrl: __ENV.API_URL ?? 'http://localhost:4000',
  rpcUrl: __ENV.RPC_URL ?? 'http://127.0.0.1:8545',

  signerMode,
  k6Profile: __ENV.K6_PROFILE,
  strictWalletPool: parseBoolean('STRICT_WALLET_POOL', true),
  checkUnlockedWallets: parseBoolean('CHECK_UNLOCKED_WALLETS', signerMode === 'rpc_unlocked'),
  logRpcErrors: parseBoolean('LOG_RPC_ERRORS', true),

  chainId: parseInteger('CHAIN_ID', 0, 0),
  txGasLimit: parseInteger('TX_GAS_LIMIT', 900000, 21000),
  txTimeoutMs: parseInteger('TX_TIMEOUT_MS', 120000, 1000),
  txPollIntervalMs: parseInteger('TX_POLL_INTERVAL_MS', 1500, 100),
  txMaxRetries: parseInteger('TX_MAX_RETRIES', 3, 1),

  useEip1559: parseBoolean('USE_EIP1559', true),
  maxPriorityFeeGwei: parseNumber('MAX_PRIORITY_FEE_GWEI', 2, 0),
  maxFeeMultiplier: parseInteger('MAX_FEE_MULTIPLIER', 2, 1),

  ownerSecondaryOffset: parseInteger(
    'OWNER_SECONDARY_OFFSET',
    defaultOwnerSecondaryOffset,
    1
  ),
  transferAcceptEnabled: parseBoolean('TRANSFER_ACCEPT_ENABLED', true),

  throughputMinRps: parseNumber('THROUGHPUT_MIN_RPS', 0, 0),
  tracePublicIds: parseCsv(__ENV.TRACE_PUBLIC_IDS),
};

export const walletPools = {
  OWNER: ownerWallets,
  CLINIC: clinicWallets,
};

export const getWalletPool = (role) => {
  const normalized = `${role}`.trim().toUpperCase();
  const pool = walletPools[normalized];
  if (!pool) {
    throw new Error(`Unsupported role for wallet pool: ${role}`);
  }
  return pool;
};

export const getWalletByRoleAndOffset = (role, offset = 0) => {
  const pool = getWalletPool(role);
  if (pool.length === 0) {
    throw new Error(`Wallet pool for role ${role} is empty.`);
  }

  const base = Math.max(__VU - 1, 0);
  const index = (base + Math.max(offset, 0)) % pool.length;
  return pool[index];
};

export const getWalletCount = (role) => getWalletPool(role).length;

export const getWalletByAddress = (walletAddress) => {
  if (!walletAddress) {
    return null;
  }

  return walletLookup.get(`${walletAddress}`.toLowerCase()) ?? null;
};
