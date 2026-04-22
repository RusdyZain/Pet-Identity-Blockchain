import { Wallet } from '../vendor/ethers.bundle.mjs';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const PRIVATE_KEY_REGEX = /^(0x)?[a-fA-F0-9]{64}$/;

// --- DATA HARDCODE UNTUK SKRIPSI (PASTI TEMBUS) ---
const HARDCODE_OWNER_KEYS = '23de5c2ec9f50902eb51eee72c8e3c22805b6b3ba3cab9d62e8b3a9a1d1b625c,9b5fceedaac929a8ce7c1996f3ca7547548c81fb55f54b09e9e0afaa12d3c88a,bf6702d56ebc444eed8bb3bb184f297181334f4c802d4cef9323d008b4fd15c6,19ed5a370e622c47e53f5a9ffb7b27599455b5f589fc16313c51f977f02d5b99,0438b0dab009808e806707975f26f598fbfb3ba1bef8319da890edca8b58cb06,f260044760c8db852d0be3c945b901acd1b80b4b84b2e8a1c5257b41721e757b';
const HARDCODE_CLINIC_KEYS = 'a8b7e3cd74810996a20e5037c47b7e2837d37c30c144caa16bccaef7fef97e7d,d75f9e741cd09dbcb25e4ba3cfdfca93bfbd5abfd43bd42536c0531693398ab7,21626634146bcaedbf4032ba29766be580f30f1c415397f251ae5162ded54e74,f49c3cd3e468b90ad2d4853fc60fd305667cecd89279af41b8773304ce5cd85e,a990b65769f9c5b8572a677f5eb194b546e18c948cd3118623fe71142c1a568e,a2e020a409c89de2482564102d1306c714b3dec94d17e94d00eaaa5e7e682c71';

const parseCsv = (raw) =>
  `${raw ?? ''}`
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const normalizePrivateKey = (privateKey, label) => {
  const normalized = `${privateKey}`.trim();
  if (!PRIVATE_KEY_REGEX.test(normalized)) {
    throw new Error(`Invalid private key in ${label}.`);
  }
  return normalized.startsWith('0x') ? normalized : `0x${normalized}`;
};

const deriveAddressFromPrivateKey = (privateKey) => {
  return new Wallet(privateKey).address;
};

const buildWalletEntries = (role, keysRaw) => {
  const keys = parseCsv(keysRaw).map(k => normalizePrivateKey(k, role));
  return keys.map((key, index) => {
    const address = deriveAddressFromPrivateKey(key);
    return {
      address,
      email: `${role.toLowerCase()}_${index}@pet.local`,
      privateKey: key,
    };
  });
};

// --- LOGIKA UTAMA ---
const signerMode = 'local_private_key';
const ownerWallets = buildWalletEntries('OWNER', HARDCODE_OWNER_KEYS);
const clinicWallets = buildWalletEntries('CLINIC', HARDCODE_CLINIC_KEYS);

const walletLookup = new Map();
[...ownerWallets, ...clinicWallets].forEach(w => walletLookup.set(w.address.toLowerCase(), w));

export const ENV = {
  apiUrl: __ENV.API_URL ?? 'http://localhost:4000',
  rpcUrl: __ENV.RPC_URL ?? 'https://eth-sepolia.g.alchemy.com/v2/7z9cWB7RrlLQJRvfl_71M',
  signerMode: 'local_private_key',
  k6Profile: __ENV.K6_PROFILE ?? 'ci',
  strictWalletPool: true,
  chainId: 11155111,
  txGasLimit: 200000,
  txTimeoutMs: 120000,
  txPollIntervalMs: 1500,
  txMaxRetries: 3,
  useEip1559: true,
  maxPriorityFeeGwei: 2,
  maxFeeMultiplier: 2,
  ownerSecondaryOffset: 1,
  transferAcceptEnabled: true,
};

export const walletPools = { OWNER: ownerWallets, CLINIC: clinicWallets };

export const getWalletPool = (role) => {
  const pool = walletPools[role.toUpperCase()];
  if (!pool) throw new Error(`Role ${role} not found`);
  return pool;
};

export const getWalletByRoleAndOffset = (role, offset = 0) => {
  const pool = getWalletPool(role);
  const base = Math.max(__VU - 1, 0);
  const index = (base + offset) % pool.length;
  return pool[index];
};

export const getWalletCount = (role) => getWalletPool(role).length;
export const getWalletByAddress = (addr) => walletLookup.get(addr.toLowerCase()) ?? null;