import { sleep } from 'k6';

export const randomInt = (min, max) => {
  const start = Math.ceil(min);
  const end = Math.floor(max);
  return Math.floor(Math.random() * (end - start + 1)) + start;
};

export const randomChoice = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return undefined;
  }
  return items[randomInt(0, items.length - 1)];
};

export const sleepMs = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return;
  }
  sleep(ms / 1000);
};

export const toHexNumber = (value) => {
  if (typeof value === 'bigint') {
    return `0x${value.toString(16)}`;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Cannot encode invalid numeric value to hex: ${value}`);
    }
    return `0x${Math.floor(value).toString(16)}`;
  }

  if (typeof value === 'string' && value.length > 0) {
    if (value.startsWith('0x') || value.startsWith('0X')) {
      return value;
    }
    const parsed = BigInt(value);
    return `0x${parsed.toString(16)}`;
  }

  throw new Error(`Unsupported value type for hex encoding: ${typeof value}`);
};

export const hexToBigInt = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid hex value: ${value}`);
  }

  if (value === '0x' || value === '0X') {
    return 0n;
  }

  return BigInt(value);
};

export const utf8ToHex = (value) => {
  const encoded = new TextEncoder().encode(value ?? '');
  let result = '0x';

  for (let i = 0; i < encoded.length; i += 1) {
    result += encoded[i].toString(16).padStart(2, '0');
  }

  return result;
};

export const safeJson = (response) => {
  try {
    return response.json();
  } catch (_error) {
    return null;
  }
};

export const nowMs = () => Date.now();
