import type { Express } from "express";
import request from "supertest";
import { Wallet } from "ethers";
import { expect } from "vitest";
import { MedicalRecordStatus, UserRole } from "../../../src/types/enums";

export type ActorRegistrationInput = {
  wallet: Wallet;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthSession = {
  token: string;
  userId: number;
  walletAddress: string;
  email: string;
  role: UserRole;
};

export type PetPayload = {
  name: string;
  species: string;
  breed: string;
  birth_date: string;
  color: string;
  physical_mark: string;
};

export type MedicalPayload = {
  vaccine_type: string;
  batch_number: string;
  given_at: string;
  notes?: string;
  evidence_url?: string;
};

let identitySequence = 0;

const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const makeIdentity = (params: {
  role: UserRole;
  label: string;
}): ActorRegistrationInput => {
  identitySequence += 1;
  const suffix = `${Date.now()}-${identitySequence}`;
  return {
    wallet: Wallet.createRandom(),
    name: `${params.label} ${identitySequence}`,
    email: `${params.label.toLowerCase().replace(/\s+/g, ".")}.${suffix}@example.com`,
    role: params.role,
  };
};

export const registerAndLogin = async (
  app: Express,
  params: ActorRegistrationInput
): Promise<AuthSession> => {
  const challengeResponse = await request(app)
    .post("/auth/wallet/challenge")
    .send({ walletAddress: params.wallet.address });
  expect(challengeResponse.status).toBe(200);

  const registerSignature = await params.wallet.signMessage(
    challengeResponse.body.message
  );
  const registerResponse = await request(app).post("/auth/register").send({
    name: params.name,
    email: params.email,
    role: params.role,
    walletAddress: params.wallet.address,
    message: challengeResponse.body.message,
    signature: registerSignature,
  });
  expect(registerResponse.status).toBe(201);

  const loginChallenge = await request(app)
    .post("/auth/wallet/challenge")
    .send({ walletAddress: params.wallet.address });
  expect(loginChallenge.status).toBe(200);

  const loginSignature = await params.wallet.signMessage(
    loginChallenge.body.message
  );
  const loginResponse = await request(app).post("/auth/login").send({
    walletAddress: params.wallet.address,
    message: loginChallenge.body.message,
    signature: loginSignature,
  });
  expect(loginResponse.status).toBe(200);

  return {
    token: loginResponse.body.token,
    userId: loginResponse.body.user.id,
    walletAddress: params.wallet.address,
    email: params.email,
    role: params.role,
  };
};

export const registerPetFlow = async (params: {
  app: Express;
  ownerToken: string;
  petPayload: PetPayload;
  txHash: string;
}) => {
  const prepared = await request(params.app)
    .post("/pets/prepare-registration")
    .set(authHeader(params.ownerToken))
    .send(params.petPayload);
  expect(prepared.status).toBe(200);
  expect(prepared.body.txRequest.to).toBeTruthy();
  expect(prepared.body.publicId).toBeTruthy();

  const created = await request(params.app)
    .post("/pets")
    .set(authHeader(params.ownerToken))
    .send({
      ...params.petPayload,
      publicId: prepared.body.publicId,
      txHash: params.txHash,
    });
  expect(created.status).toBe(201);

  return {
    petId: created.body.pet.id as number,
    publicId: prepared.body.publicId as string,
    pet: created.body.pet,
  };
};

export const createMedicalRecordFlow = async (params: {
  app: Express;
  clinicToken: string;
  petId: number;
  payload: MedicalPayload;
  txHash: string;
}) => {
  const prepared = await request(params.app)
    .post(`/pets/${params.petId}/medical-records/prepare`)
    .set(authHeader(params.clinicToken))
    .send(params.payload);
  expect(prepared.status).toBe(200);
  expect(prepared.body.txRequest.data).toBeTruthy();

  const created = await request(params.app)
    .post(`/pets/${params.petId}/medical-records`)
    .set(authHeader(params.clinicToken))
    .send({
      ...params.payload,
      txHash: params.txHash,
    });
  expect(created.status).toBe(201);

  return {
    recordId: created.body.record.id as number,
    record: created.body.record,
  };
};

export const reviewMedicalRecordFlow = async (params: {
  app: Express;
  clinicToken: string;
  recordId: number;
  status: MedicalRecordStatus;
  txHash: string;
}) => {
  const prepared = await request(params.app)
    .patch(`/medical-records/${params.recordId}/verify/prepare`)
    .set(authHeader(params.clinicToken))
    .send({ status: params.status });
  expect(prepared.status).toBe(200);
  expect(prepared.body.txRequest.data).toBeTruthy();

  const reviewed = await request(params.app)
    .patch(`/medical-records/${params.recordId}/verify`)
    .set(authHeader(params.clinicToken))
    .send({
      status: params.status,
      txHash: params.txHash,
    });
  expect(reviewed.status).toBe(200);

  return reviewed.body.record;
};

export const transferOwnershipFlow = async (params: {
  app: Express;
  ownerToken: string;
  petId: number;
  newOwnerEmail: string;
  txHash: string;
}) => {
  const prepared = await request(params.app)
    .post(`/pets/${params.petId}/prepare-transfer-ownership`)
    .set(authHeader(params.ownerToken))
    .send({ new_owner_email: params.newOwnerEmail });
  expect(prepared.status).toBe(200);
  expect(prepared.body.txRequest.data).toBeTruthy();

  const transferred = await request(params.app)
    .post(`/pets/${params.petId}/transfer`)
    .set(authHeader(params.ownerToken))
    .send({
      new_owner_email: params.newOwnerEmail,
      txHash: params.txHash,
    });
  expect(transferred.status).toBe(200);

  return transferred.body;
};
