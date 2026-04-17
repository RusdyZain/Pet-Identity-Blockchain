import { apiRequest, parseJsonOrThrow } from './api.js';
import { getWalletByRoleAndOffset } from './env.js';
import { signMessage } from './rpc.js';

const sessionCache = new Map();

const requestChallenge = (walletAddress, tags = {}) => {
  const response = apiRequest('POST', '/auth/wallet/challenge', {
    body: { walletAddress },
    expectedStatuses: [200],
    tags,
    name: 'auth.wallet.challenge',
  });

  return parseJsonOrThrow(response, 'wallet challenge');
};

const loginWithChallenge = ({ walletAddress, message, signature }, tags = {}) =>
  apiRequest('POST', '/auth/login', {
    body: {
      walletAddress,
      message,
      signature,
    },
    expectedStatuses: [200, 404],
    tags,
    name: 'auth.wallet.login',
  });

const registerWithChallenge = (
  { role, walletAddress, email, name, message, signature },
  tags = {}
) =>
  apiRequest('POST', '/auth/register', {
    body: {
      role,
      walletAddress,
      email,
      name,
      message,
      signature,
    },
    expectedStatuses: [201, 400],
    tags,
    name: 'auth.wallet.register',
  });

const createSignedChallenge = (walletEntry, tags = {}) => {
  const challenge = requestChallenge(walletEntry.address, tags);
  const signature = signMessage(walletEntry.address, challenge.message, tags);

  return {
    walletAddress: walletEntry.address,
    message: challenge.message,
    signature,
  };
};

const parseTokenFromLogin = (response, context) => {
  if (response.status !== 200) {
    throw new Error(`Unexpected login status ${response.status} (${context})`);
  }

  const body = parseJsonOrThrow(response, context);
  if (!body.token) {
    throw new Error(`Login response missing token (${context})`);
  }

  return body.token;
};

export const authenticateWallet = (role, walletEntry, options = {}) => {
  const {
    useCache = true,
    cacheKey = `${role}:${walletEntry.address}`,
    tags = {},
  } = options;

  if (useCache && sessionCache.has(cacheKey)) {
    return sessionCache.get(cacheKey);
  }

  const baseTags = {
    role,
    ...(tags || {}),
  };

  const loginPayload = createSignedChallenge(walletEntry, {
    ...baseTags,
    step: 'auth-login-initial',
  });
  const loginResponse = loginWithChallenge(loginPayload, {
    ...baseTags,
    step: 'auth-login-initial',
  });

  let token;

  if (loginResponse.status === 200) {
    token = parseTokenFromLogin(loginResponse, 'initial login');
  } else if (loginResponse.status === 404) {
    const registerPayload = createSignedChallenge(walletEntry, {
      ...baseTags,
      step: 'auth-register',
    });

    const registerResponse = registerWithChallenge(
      {
        role,
        walletAddress: walletEntry.address,
        email: walletEntry.email,
        name: `${role} ${walletEntry.address.slice(-6)}`,
        message: registerPayload.message,
        signature: registerPayload.signature,
      },
      {
        ...baseTags,
        step: 'auth-register',
      }
    );

    if (registerResponse.status !== 201 && registerResponse.status !== 400) {
      throw new Error(`Unexpected register status ${registerResponse.status}`);
    }

    const finalLoginPayload = createSignedChallenge(walletEntry, {
      ...baseTags,
      step: 'auth-login-final',
    });
    const finalLoginResponse = loginWithChallenge(finalLoginPayload, {
      ...baseTags,
      step: 'auth-login-final',
    });

    token = parseTokenFromLogin(finalLoginResponse, 'post-register login');
  } else {
    throw new Error(`Unexpected login status ${loginResponse.status}`);
  }

  const session = {
    role,
    walletAddress: walletEntry.address,
    email: walletEntry.email,
    token,
  };

  if (useCache) {
    sessionCache.set(cacheKey, session);
  }

  return session;
};

export const getSessionForRole = (role, offset = 0, options = {}) => {
  const walletEntry = getWalletByRoleAndOffset(role, offset);
  return authenticateWallet(role, walletEntry, options);
};

export const clearAuthCache = () => {
  sessionCache.clear();
};
