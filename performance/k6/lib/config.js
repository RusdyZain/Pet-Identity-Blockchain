import { ENV } from './env.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const maxTargetFromStages = (stages = []) =>
  stages.reduce((max, stage) => {
    const target = Number(stage?.target ?? 0);
    return Number.isFinite(target) && target > max ? target : max;
  }, 0);

const estimateScenarioMaxVUs = (scenario) => {
  const executor = `${scenario.executor ?? ''}`;

  if (executor === 'constant-vus') {
    return Number(scenario.vus ?? 0);
  }

  if (executor === 'ramping-vus') {
    const stageMax = maxTargetFromStages(scenario.stages);
    return Math.max(Number(scenario.startVUs ?? 0), stageMax);
  }

  if (executor === 'constant-arrival-rate' || executor === 'ramping-arrival-rate') {
    const maxVUs = Number(scenario.maxVUs ?? 0);
    const preAllocatedVUs = Number(scenario.preAllocatedVUs ?? 0);
    return Math.max(maxVUs, preAllocatedVUs);
  }

  if (executor === 'per-vu-iterations') {
    return Number(scenario.vus ?? 0);
  }

  return 1;
};

const stripScenarioInternalFields = (scenario) => {
  const next = clone(scenario);
  delete next.walletNeeds;
  return next;
};

const buildWalletRequirements = (rawScenarios) => {
  const requirements = {
    OWNER: 0,
    CLINIC: 0,
  };

  for (const scenario of Object.values(rawScenarios)) {
    const walletNeeds = scenario.walletNeeds ?? {};
    const maxVUs = estimateScenarioMaxVUs(scenario);

    for (const [role, perVu] of Object.entries(walletNeeds)) {
      const count = Number(perVu ?? 0);
      if (!Number.isFinite(count) || count <= 0) {
        continue;
      }

      if (!requirements[role]) {
        requirements[role] = 0;
      }

      requirements[role] += maxVUs * count;
    }
  }

  return requirements;
};

export const buildTestPlan = (scenarioDocument) => {
  const profileName = ENV.k6Profile || scenarioDocument.defaultProfile || 'baseline';
  const profile = scenarioDocument.profiles?.[profileName];

  if (!profile) {
    const knownProfiles = Object.keys(scenarioDocument.profiles || {}).join(', ');
    throw new Error(`Unknown K6 profile: ${profileName}. Available profiles: ${knownProfiles}`);
  }

  const rawScenarios = profile.scenarios || {};
  const scenarios = {};

  for (const [name, scenario] of Object.entries(rawScenarios)) {
    scenarios[name] = stripScenarioInternalFields(scenario);
  }

  const thresholds = clone(scenarioDocument.thresholds || {});
  if (ENV.throughputMinRps > 0) {
    thresholds.http_reqs = [`rate>${ENV.throughputMinRps}`];
  }

  return {
    profileName,
    profileDescription: profile.description || '',
    walletRequirements: buildWalletRequirements(rawScenarios),
    options: {
      scenarios,
      thresholds,
      summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max', 'count'],
      discardResponseBodies: false,
      noConnectionReuse: false,
      userAgent: 'k6-web-blockchain-performance-suite',
    },
  };
};
