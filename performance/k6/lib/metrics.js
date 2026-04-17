import { Counter, Rate, Trend } from 'k6/metrics';

export const txSubmitMs = new Trend('tx_submit_ms', true);
export const txConfirmMs = new Trend('tx_confirm_ms', true);
export const endToEndFlowLatency = new Trend('end_to_end_flow_latency', true);

export const rpcErrorRate = new Rate('rpc_error_rate');
export const flowSuccessRate = new Rate('flow_success_rate');

export const nonceConflictCount = new Counter('nonce_conflict_count');
export const flowSkippedCount = new Counter('flow_skipped_count');
