import http from 'k6/http';
import { check } from 'k6';

import { ENV, getWalletPool, getWalletCount } from './env.js';
import { listUnlockedWallets, readChainId } from './rpc.js';

const validateWalletPoolSize = (role, requiredCount) => {
  const available = getWalletCount(role);

  if (requiredCount <= 0) {
    return;
  }

  if (available >= requiredCount) {
    return;
  }

  const message =
    `Wallet pool ${role} tidak cukup untuk profile ini. ` +
    `Required=${requiredCount}, available=${available}. ` +
    `Tambahkan ${role}_WALLET_ADDRESSES atau turunkan skenario write-heavy.`;

  if (ENV.strictWalletPool) {
    throw new Error(message);
  }

  console.warn(`[WARN] ${message} Reuse wallet akan terjadi.`);
};

const validateUnlockedWallets = () => {
  if (ENV.signerMode !== 'rpc_unlocked') {
    return;
  }

  if (!ENV.checkUnlockedWallets) {
    return;
  }

  const unlocked = listUnlockedWallets({ flow: 'setup', step: 'unlocked-wallet-check' })
    .map((item) => `${item}`.toLowerCase());

  const unlockedSet = new Set(unlocked);

  for (const role of ['OWNER', 'CLINIC']) {
    const pool = getWalletPool(role);

    for (const wallet of pool) {
      const normalized = wallet.address.toLowerCase();
      if (!unlockedSet.has(normalized)) {
        const message =
          `Wallet ${wallet.address} (${role}) tidak ditemukan pada eth_accounts RPC. ` +
          `Flow write-heavy kemungkinan gagal di eth_sendTransaction.`;

        if (ENV.strictWalletPool) {
          throw new Error(message);
        }

        console.warn(`[WARN] ${message}`);
      }
    }
  }
};

export const runPreflight = (plan) => {
  const health = http.get(`${ENV.apiUrl}/health`, {
    tags: { flow: 'setup', step: 'health-check', component: 'api' },
  });

  const healthy = check(health, {
    'health check status is 200': (res) => res.status === 200,
  });

  if (!healthy) {
    throw new Error(`API health check gagal: ${health.status}`);
  }

  validateWalletPoolSize('OWNER', plan.walletRequirements.OWNER ?? 0);
  validateWalletPoolSize('CLINIC', plan.walletRequirements.CLINIC ?? 0);

  const chainIdHex = readChainId({ flow: 'setup', step: 'chain-id' });
  validateUnlockedWallets();

  return {
    profile: plan.profileName,
    profileDescription: plan.profileDescription,
    chainId: chainIdHex,
    requiredWallets: plan.walletRequirements,
    timestamp: new Date().toISOString(),
  };
};
