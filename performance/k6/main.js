/** * 1. KONFIGURASI ENVIRONMENT (WAJIB DI PALING ATAS)
 */
globalThis.__ENV.K6_CLOUD_TOKEN = '77a528d22c00e01ff57e937beea31f56e4232d7de0c20fac6930cb5f2ff60996';
globalThis.__ENV.K6_PROFILE = 'ci'; // Tetap 'ci' karena wallet sudah lengkap (6 buah)
globalThis.__ENV.SIGNER_MODE = 'local_private_key';

// Targets
globalThis.__ENV.API_URL = 'http://localhost:4000';
globalThis.__ENV.RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/7z9cWB7RrlLQJRvfl_71M';
globalThis.__ENV.CHAIN_ID = '11155111';

// Wallet Pool - OWNER (Pastikan tidak ada spasi di antara koma)
globalThis.__ENV.OWNER_PRIVATE_KEYS = '23de5c2ec9f50902eb51eee72c8e3c22805b6b3ba3cab9d62e8b3a9a1d1b625c,9b5fceedaac929a8ce7c1996f3ca7547548c81fb55f54b09e9e0afaa12d3c88a,bf6702d56ebc444eed8bb3bb184f297181334f4c802d4cef9323d008b4fd15c6,19ed5a370e622c47e53f5a9ffb7b27599455b5f589fc16313c51f977f02d5b99,0438b0dab009808e806707975f26f598fbfb3ba1bef8319da890edca8b58cb06,f260044760c8db852d0be3c945b901acd1b80b4b84b2e8a1c5257b41721e757b';
globalThis.__ENV.OWNER_WALLET_ADDRESSES = '0x8b22A01Ea8773a65105b0B105ee673E88ec127Fb,0x06b0F4C4E37a456aF7144752a47Ee91797F7f64B,0x3a8D9FABC8bf7Cc27239449eBF832c789143711E,0xfada03eB046f459172848A7640B85C34B3874Aa5,0xE36fC9950c3Ee4a960dC8722dc1171a88aaF520C,0xb33557a53103eda50a1879D1b5DA06d725ccE47B';

// Wallet Pool - CLINIC
globalThis.__ENV.CLINIC_PRIVATE_KEYS = 'a8b7e3cd74810996a20e5037c47b7e2837d37c30c144caa16bccaef7fef97e7d,d75f9e741cd09dbcb25e4ba3cfdfca93bfbd5abfd43bd42536c0531693398ab7,21626634146bcaedbf4032ba29766be580f30f1c415397f251ae5162ded54e74,f49c3cd3e468b90ad2d4853fc60fd305667cecd89279af41b8773304ce5cd85e,a990b65769f9c5b8572a677f5eb194b546e18c948cd3118623fe71142c1a568e,a2e020a409c89de2482564102d1306c714b3dec94d17e94d00eaaa5e7e682c71';
globalThis.__ENV.CLINIC_WALLET_ADDRESSES = '0xEa99701cbae7C5a1DC144fDB0e54C40Db7dAC957,0x94663852496B6e0471153C1C4318614fC55EB373,0x5B5Cb6e4fF0581c06EDc416ec1f194abF24E5a9B,0xE2dC8d7Fe86aeCc2F425ea5573B7eE2A58457aED,0x6460BF1DF952D0F9E52582973f46b9AA1E22A9e8,0x1C6B3A14E23F384Fc97e790CdCcEC01eF701C871';

// Tuning & Toggles
globalThis.__ENV.STRICT_WALLET_POOL = 'true';
globalThis.__ENV.CHECK_UNLOCKED_WALLETS = 'false';
globalThis.__ENV.LOG_RPC_ERRORS = 'true';
globalThis.__ENV.TX_GAS_LIMIT = '200000';

/**
 * 2. IMPORT (SETELAH ENV DIATUR)
 */
import { ENV } from './lib/env.js';
import { buildTestPlan } from './lib/config.js';
import {
  authBurst,
  correctionTransferFlow,
  readHeavyTraffic,
  traceNotificationFlow,
  writeHeavyBlockchain,
} from './lib/flows.js';
import { runPreflight } from './lib/preflight.js';

/**
 * 3. LOGIKA TEST
 */
const scenarioDocument = JSON.parse(open('./scenarios.json'));
const testPlan = buildTestPlan(scenarioDocument);

export const options = testPlan.options;

export function setup() {
  const setupData = runPreflight(testPlan);

  console.log(
    `[setup] profile=${setupData.profile} chainId=${setupData.chainId} ` +
    `signerMode=${ENV.signerMode} requiredWallets=${JSON.stringify(setupData.requiredWallets)}`
  );

  return setupData;
}

export {
  authBurst,
  correctionTransferFlow,
  readHeavyTraffic,
  traceNotificationFlow,
  writeHeavyBlockchain,
};