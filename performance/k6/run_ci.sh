#!/usr/bin/env bash
set -euo pipefail

PROFILE="${K6_PROFILE:-ci}"
LOCAL_EXECUTION="${K6_CLOUD_LOCAL_EXECUTION:-false}"

if [[ -z "${K6_CLOUD_TOKEN:-}" ]]; then
  echo "K6_CLOUD_TOKEN is required for Grafana Cloud execution." >&2
  exit 1
fi

if [[ "${LOCAL_EXECUTION}" == "true" ]]; then
  k6 cloud run --local-execution performance/k6/main.js --env K6_PROFILE="${PROFILE}"
else
  k6 cloud run performance/k6/main.js --env K6_PROFILE="${PROFILE}"
fi