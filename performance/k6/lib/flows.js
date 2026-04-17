import { apiRequest, parseJsonOrThrow } from './api.js';
import { getSessionForRole } from './auth.js';
import { ENV } from './env.js';
import { endToEndFlowLatency, flowSkippedCount, flowSuccessRate } from './metrics.js';
import { sendPreparedTransaction } from './rpc.js';
import { nowMs, randomChoice, randomInt } from './utils.js';

const ensureStatus = (response, expectedStatuses, context) => {
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${context} failed with status=${response.status} body=${response.body}`);
  }
};

const runFlow = async (flow, callback) => {
  const started = nowMs();

  try {
    await callback();
    flowSuccessRate.add(1, { flow });
  } catch (error) {
    flowSuccessRate.add(0, { flow });
    throw error;
  } finally {
    endToEndFlowLatency.add(nowMs() - started, { flow });
  }
};

const buildPetPayload = () => ({
  name: `K6-Pet-${randomInt(1000, 999999)}`,
  species: randomChoice(['Cat', 'Dog']),
  breed: randomChoice(['Domestic', 'Mixed', 'Persian']),
  birth_date: randomChoice(['2021-04-04', '2022-01-01', '2020-09-15']),
  color: randomChoice(['Black', 'White', 'Orange', 'Gray']),
  physical_mark: `mark-${randomInt(100, 9999)}`,
});

const buildMedicalPayload = () => ({
  vaccine_type: randomChoice(['Rabies', 'Distemper', 'Parvo']),
  batch_number: `B-${randomInt(10000, 99999)}`,
  given_at: '2025-12-01',
  notes: 'k6 load test record',
  evidence_url: 'https://example.com/evidence',
});

const createPetOnChain = async (ownerSession, flow) => {
  const payload = buildPetPayload();

  const prepare = apiRequest('POST', '/pets/prepare-registration', {
    token: ownerSession.token,
    body: payload,
    expectedStatuses: [200],
    tags: { flow, step: 'pet.prepare' },
    name: 'pets.prepare_registration',
  });
  ensureStatus(prepare, [200], 'prepare pet registration');

  const preparedBody = parseJsonOrThrow(prepare, 'prepare pet registration');
  const txHash = await sendPreparedTransaction({
    walletAddress: ownerSession.walletAddress,
    txRequest: preparedBody.txRequest,
    tags: { flow, step: 'pet.tx' },
  });

  const create = apiRequest('POST', '/pets', {
    token: ownerSession.token,
    body: {
      ...payload,
      publicId: preparedBody.publicId,
      txHash,
    },
    expectedStatuses: [201],
    tags: { flow, step: 'pet.create' },
    name: 'pets.create_with_txhash',
  });
  ensureStatus(create, [201], 'create pet');

  const createBody = parseJsonOrThrow(create, 'create pet');
  const petId = Number(createBody?.pet?.id);
  if (!Number.isFinite(petId)) {
    throw new Error('Invalid pet id in create pet response');
  }

  const publicId = createBody?.pet?.publicId || preparedBody.publicId;

  return {
    id: petId,
    publicId,
    txHash,
  };
};

const createAndVerifyMedicalRecord = async (clinicSession, petId, flow) => {
  const payload = buildMedicalPayload();

  const prepareCreate = apiRequest('POST', `/pets/${petId}/medical-records/prepare`, {
    token: clinicSession.token,
    body: payload,
    expectedStatuses: [200],
    tags: { flow, step: 'medical.prepare-create' },
    name: 'medical.prepare_create',
  });
  ensureStatus(prepareCreate, [200], 'prepare medical record');

  const preparedCreateBody = parseJsonOrThrow(prepareCreate, 'prepare medical record');
  const createTxHash = await sendPreparedTransaction({
    walletAddress: clinicSession.walletAddress,
    txRequest: preparedCreateBody.txRequest,
    tags: { flow, step: 'medical.tx-create' },
  });

  const create = apiRequest('POST', `/pets/${petId}/medical-records`, {
    token: clinicSession.token,
    body: {
      ...payload,
      txHash: createTxHash,
    },
    expectedStatuses: [201],
    tags: { flow, step: 'medical.create' },
    name: 'medical.create_with_txhash',
  });
  ensureStatus(create, [201], 'create medical record');

  const createBody = parseJsonOrThrow(create, 'create medical record');
  const recordId = Number(createBody?.record?.id);
  if (!Number.isFinite(recordId)) {
    throw new Error('Invalid medical record id in response');
  }

  const prepareVerify = apiRequest('PATCH', `/medical-records/${recordId}/verify/prepare`, {
    token: clinicSession.token,
    body: { status: 'VERIFIED' },
    expectedStatuses: [200],
    tags: { flow, step: 'medical.prepare-verify' },
    name: 'medical.prepare_verify',
  });
  ensureStatus(prepareVerify, [200], 'prepare medical verify');

  const preparedVerifyBody = parseJsonOrThrow(prepareVerify, 'prepare medical verify');
  const verifyTxHash = await sendPreparedTransaction({
    walletAddress: clinicSession.walletAddress,
    txRequest: preparedVerifyBody.txRequest,
    tags: { flow, step: 'medical.tx-verify' },
  });

  const verify = apiRequest('PATCH', `/medical-records/${recordId}/verify`, {
    token: clinicSession.token,
    body: { status: 'VERIFIED', txHash: verifyTxHash },
    expectedStatuses: [200],
    tags: { flow, step: 'medical.verify' },
    name: 'medical.verify_with_txhash',
  });
  ensureStatus(verify, [200], 'verify medical record');

  return {
    recordId,
    createTxHash,
    verifyTxHash,
  };
};

const pickTracePublicId = (petsBody) => {
  if (Array.isArray(petsBody) && petsBody.length > 0) {
    const candidate = randomChoice(petsBody);
    if (candidate?.publicId) {
      return candidate.publicId;
    }
  }

  if (ENV.tracePublicIds.length > 0) {
    return randomChoice(ENV.tracePublicIds);
  }

  return null;
};

export const readHeavyTraffic = async () => {
  await runFlow('read-heavy', async () => {
    const owner = getSessionForRole('OWNER', 0, { useCache: true, tags: { flow: 'read-heavy' } });

    const listPets = apiRequest('GET', '/pets', {
      token: owner.token,
      expectedStatuses: [200],
      tags: { flow: 'read-heavy', step: 'pets.list' },
      name: 'pets.list',
    });
    ensureStatus(listPets, [200], 'list pets');

    const petsBody = parseJsonOrThrow(listPets, 'list pets');
    const selectedPet = Array.isArray(petsBody) && petsBody.length > 0 ? randomChoice(petsBody) : null;

    if (selectedPet?.id) {
      const petId = selectedPet.id;

      const detail = apiRequest('GET', `/pets/${petId}`, {
        token: owner.token,
        expectedStatuses: [200],
        tags: { flow: 'read-heavy', step: 'pets.detail' },
        name: 'pets.detail',
      });
      ensureStatus(detail, [200], 'pet detail');

      const history = apiRequest('GET', `/pets/${petId}/ownership-history`, {
        token: owner.token,
        expectedStatuses: [200],
        tags: { flow: 'read-heavy', step: 'pets.ownership-history' },
        name: 'pets.ownership_history',
      });
      ensureStatus(history, [200], 'ownership history');

      const medicalList = apiRequest('GET', `/pets/${petId}/medical-records`, {
        token: owner.token,
        expectedStatuses: [200],
        tags: { flow: 'read-heavy', step: 'medical.list' },
        name: 'medical.list',
      });
      ensureStatus(medicalList, [200], 'medical list');
    }

    const notifications = apiRequest('GET', '/notifications', {
      token: owner.token,
      expectedStatuses: [200],
      tags: { flow: 'read-heavy', step: 'notifications.list' },
      name: 'notifications.list',
    });
    ensureStatus(notifications, [200], 'notification list');

    const tracePublicId = pickTracePublicId(petsBody);
    if (tracePublicId) {
      const trace = apiRequest('GET', `/trace/${tracePublicId}`, {
        expectedStatuses: [200, 404],
        tags: { flow: 'read-heavy', step: 'trace.lookup' },
        name: 'trace.lookup',
      });

      if (trace.status !== 200 && trace.status !== 404) {
        throw new Error(`Trace lookup failed with status=${trace.status}`);
      }
    } else {
      flowSkippedCount.add(1, { flow: 'read-heavy', reason: 'no-trace-id' });
    }
  });
};

export const authBurst = async () => {
  await runFlow('auth-burst', async () => {
    const rotatingOffset = Number(__ITER) || 0;

    const session = getSessionForRole('OWNER', rotatingOffset, {
      useCache: false,
      cacheKey: `auth-burst:${rotatingOffset}`,
      tags: { flow: 'auth-burst' },
    });

    const profile = apiRequest('GET', '/owners/me', {
      token: session.token,
      expectedStatuses: [200],
      tags: { flow: 'auth-burst', step: 'owners.me' },
      name: 'owners.me',
    });
    ensureStatus(profile, [200], 'owner profile');
  });
};

export const writeHeavyBlockchain = async () => {
  await runFlow('write-heavy', async () => {
    const owner = getSessionForRole('OWNER', 0, { useCache: true, tags: { flow: 'write-heavy' } });
    const clinic = getSessionForRole('CLINIC', 0, { useCache: true, tags: { flow: 'write-heavy' } });

    const pet = await createPetOnChain(owner, 'write-heavy');
    await createAndVerifyMedicalRecord(clinic, pet.id, 'write-heavy');

    const finalDetail = apiRequest('GET', `/pets/${pet.id}`, {
      token: owner.token,
      expectedStatuses: [200],
      tags: { flow: 'write-heavy', step: 'pets.detail-post-write' },
      name: 'pets.detail',
    });
    ensureStatus(finalDetail, [200], 'final pet detail');
  });
};

export const traceNotificationFlow = async () => {
  await runFlow('trace-notification', async () => {
    const owner = getSessionForRole('OWNER', 0, {
      useCache: true,
      tags: { flow: 'trace-notification' },
    });

    const notificationRes = apiRequest('GET', '/notifications', {
      token: owner.token,
      expectedStatuses: [200],
      tags: { flow: 'trace-notification', step: 'notifications.list' },
      name: 'notifications.list',
    });
    ensureStatus(notificationRes, [200], 'notification list');

    const notificationsBody = parseJsonOrThrow(notificationRes, 'notification list');
    if (Array.isArray(notificationsBody) && notificationsBody.length > 0) {
      const target = notificationsBody[0];
      if (target?.id) {
        const markRead = apiRequest('PATCH', `/notifications/${target.id}/read`, {
          token: owner.token,
          body: {},
          expectedStatuses: [200],
          tags: { flow: 'trace-notification', step: 'notifications.mark-read' },
          name: 'notifications.mark_read',
        });
        ensureStatus(markRead, [200], 'mark notification read');
      }
    }

    const petsRes = apiRequest('GET', '/pets', {
      token: owner.token,
      expectedStatuses: [200],
      tags: { flow: 'trace-notification', step: 'pets.list' },
      name: 'pets.list',
    });
    ensureStatus(petsRes, [200], 'list pets');

    const tracePublicId = pickTracePublicId(parseJsonOrThrow(petsRes, 'list pets'));
    if (!tracePublicId) {
      flowSkippedCount.add(1, { flow: 'trace-notification', reason: 'no-trace-id' });
      return;
    }

    const trace = apiRequest('GET', `/trace/${tracePublicId}`, {
      expectedStatuses: [200, 404],
      tags: { flow: 'trace-notification', step: 'trace.lookup' },
      name: 'trace.lookup',
    });

    if (trace.status !== 200 && trace.status !== 404) {
      throw new Error(`Trace endpoint returned unexpected status=${trace.status}`);
    }
  });
};

export const correctionTransferFlow = async () => {
  await runFlow('correction-transfer', async () => {
    const ownerPrimary = getSessionForRole('OWNER', 0, {
      useCache: true,
      tags: { flow: 'correction-transfer', actor: 'owner-primary' },
    });
    const ownerSecondary = getSessionForRole('OWNER', ENV.ownerSecondaryOffset, {
      useCache: true,
      tags: { flow: 'correction-transfer', actor: 'owner-secondary' },
    });
    const clinic = getSessionForRole('CLINIC', 0, {
      useCache: true,
      tags: { flow: 'correction-transfer', actor: 'clinic' },
    });

    const pet = await createPetOnChain(ownerPrimary, 'correction-transfer');

    const createCorrection = apiRequest('POST', `/pets/${pet.id}/corrections`, {
      token: ownerPrimary.token,
      body: {
        field_name: 'color',
        new_value: randomChoice(['Black', 'White', 'Brown', 'Cream']),
        reason: 'k6 correction flow',
      },
      expectedStatuses: [201],
      tags: { flow: 'correction-transfer', step: 'correction.create' },
      name: 'correction.create',
    });
    ensureStatus(createCorrection, [201], 'create correction');

    const correctionBody = parseJsonOrThrow(createCorrection, 'create correction');
    const correctionId = Number(correctionBody?.id ?? correctionBody?.correction?.id);
    if (!Number.isFinite(correctionId)) {
      throw new Error('Invalid correction id from create correction response');
    }

    const prepareReview = apiRequest('PATCH', `/corrections/${correctionId}/prepare`, {
      token: clinic.token,
      body: { status: 'APPROVED' },
      expectedStatuses: [200],
      tags: { flow: 'correction-transfer', step: 'correction.prepare-review' },
      name: 'correction.prepare_review',
    });
    ensureStatus(prepareReview, [200], 'prepare correction review');

    const prepareReviewBody = parseJsonOrThrow(prepareReview, 'prepare correction review');
    let correctionTxHash;

    if (prepareReviewBody?.requiresOnChainTx) {
      if (!prepareReviewBody.txRequest) {
        throw new Error('Correction prepare returned requiresOnChainTx=true but txRequest is missing');
      }

      correctionTxHash = await sendPreparedTransaction({
        walletAddress: clinic.walletAddress,
        txRequest: prepareReviewBody.txRequest,
        tags: { flow: 'correction-transfer', step: 'correction.tx-review' },
      });
    }

    const review = apiRequest('PATCH', `/corrections/${correctionId}`, {
      token: clinic.token,
      body: {
        status: 'APPROVED',
        ...(correctionTxHash ? { txHash: correctionTxHash } : {}),
      },
      expectedStatuses: [200],
      tags: { flow: 'correction-transfer', step: 'correction.review' },
      name: 'correction.review',
    });
    ensureStatus(review, [200], 'review correction');

    const transfer = apiRequest('POST', `/pets/${pet.id}/transfer`, {
      token: ownerPrimary.token,
      body: { new_owner_email: ownerSecondary.email },
      expectedStatuses: [200],
      tags: { flow: 'correction-transfer', step: 'transfer.initiate' },
      name: 'pets.transfer.initiate',
    });
    ensureStatus(transfer, [200], 'initiate transfer');

    if (ENV.transferAcceptEnabled) {
      const accept = apiRequest('POST', `/pets/${pet.id}/transfer/accept`, {
        token: ownerSecondary.token,
        body: {},
        expectedStatuses: [200],
        tags: { flow: 'correction-transfer', step: 'transfer.accept' },
        name: 'pets.transfer.accept',
      });
      ensureStatus(accept, [200], 'accept transfer');
    } else {
      flowSkippedCount.add(1, {
        flow: 'correction-transfer',
        reason: 'transfer-accept-disabled',
      });
    }

    if (pet.publicId) {
      const trace = apiRequest('GET', `/trace/${pet.publicId}`, {
        expectedStatuses: [200, 404],
        tags: { flow: 'correction-transfer', step: 'trace.lookup-post-flow' },
        name: 'trace.lookup',
      });

      if (trace.status !== 200 && trace.status !== 404) {
        throw new Error(`Trace endpoint unexpected status=${trace.status}`);
      }
    }
  });
};
