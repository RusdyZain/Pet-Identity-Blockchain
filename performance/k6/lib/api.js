import http from 'k6/http';
import { check } from 'k6';

import { ENV } from './env.js';
import { safeJson } from './utils.js';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const buildHeaders = (token, headers = {}) => {
  const merged = { ...jsonHeaders, ...headers };
  if (token) {
    merged.Authorization = `Bearer ${token}`;
  }
  return merged;
};

export const apiRequest = (method, path, options = {}) => {
  const {
    token,
    body,
    headers,
    tags,
    name,
    expectedStatuses = [200],
  } = options;

  const requestTags = {
    component: 'api',
    ...(tags || {}),
  };

  if (name) {
    requestTags.name = name;
  }

  const payload =
    body === undefined || body === null
      ? null
      : typeof body === 'string'
      ? body
      : JSON.stringify(body);

  const response = http.request(
    method,
    `${ENV.apiUrl}${path}`,
    payload,
    {
      headers: buildHeaders(token, headers),
      tags: requestTags,
    }
  );

  check(
    response,
    {
      [`${method} ${path} status in [${expectedStatuses.join(',')}]`]: (res) =>
        expectedStatuses.includes(res.status),
    },
    requestTags
  );

  return response;
};

export const parseJsonOrThrow = (response, context) => {
  const parsed = safeJson(response);
  if (parsed === null) {
    throw new Error(`Failed to parse JSON response: ${context}`);
  }
  return parsed;
};
