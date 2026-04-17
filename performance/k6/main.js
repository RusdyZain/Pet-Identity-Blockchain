import { buildTestPlan } from './lib/config.js';
import { ENV } from './lib/env.js';
import {
  authBurst,
  correctionTransferFlow,
  readHeavyTraffic,
  traceNotificationFlow,
  writeHeavyBlockchain,
} from './lib/flows.js';
import { runPreflight } from './lib/preflight.js';

const scenarioDocument = JSON.parse(open('./scenarios.json'));
const testPlan = buildTestPlan(scenarioDocument);

export const options = testPlan.options;

export function setup() {
  const setupData = runPreflight(testPlan);

  console.log(
    `[setup] profile=${setupData.profile} chainId=${setupData.chainId} ` +
      `signerMode=${ENV.signerMode} requiredWallets=${JSON.stringify(setupData.requiredWallets)}`
  );

  if (setupData.profileDescription) {
    console.log(`[setup] ${setupData.profileDescription}`);
  }

  return setupData;
}

export {
  authBurst,
  correctionTransferFlow,
  readHeavyTraffic,
  traceNotificationFlow,
  writeHeavyBlockchain,
};
