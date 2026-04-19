import "reflect-metadata";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppDataSource } from "../../src/config/dataSource";
import { ensureSchema } from "../../src/config/ensureSchema";
import { MedicalRecordStatus, UserRole } from "../../src/types/enums";
import {
  createMedicalRecordFlow,
  makeIdentity,
  registerAndLogin,
  registerPetFlow,
  reviewMedicalRecordFlow,
  transferOwnershipFlow,
} from "./helpers/apiFlowFactory";
import { resetMockPetIdentityClientState } from "./helpers/mockPetIdentityClient";

let app: Express;

const maskWalletForExpectation = (walletAddress: string) =>
  `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

describe("API integration flow", () => {
  beforeAll(async () => {
    const [{ default: appModule }] = await Promise.all([import("../../src/app")]);
    app = appModule;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await ensureSchema();
  });

  beforeEach(() => {
    resetMockPetIdentityClientState();
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("auth challenge + login flow", async () => {
    const ownerIdentity = makeIdentity({
      role: UserRole.OWNER,
      label: "owner-auth",
    });

    const ownerSession = await registerAndLogin(app, ownerIdentity);
    expect(ownerSession.token).toBeTruthy();
    expect(ownerSession.walletAddress).toBe(ownerIdentity.wallet.address);
    expect(ownerSession.userId).toBeGreaterThan(0);
  });

  it("register pet flow", async () => {
    const ownerSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.OWNER, label: "owner-register-pet" })
    );

    const petPayload = {
      name: "Milo",
      species: "Kucing",
      breed: "Domestic Short Hair",
      birth_date: "2024-01-15",
      color: "Orange",
      physical_mark: "Ekor pendek",
    };

    const createdPet = await registerPetFlow({
      app,
      ownerToken: ownerSession.token,
      petPayload,
      txHash: "0xpet-flow-001",
    });

    expect(createdPet.petId).toBeGreaterThan(0);
    expect(createdPet.publicId).toMatch(/^PET-/);
    expect(createdPet.pet.name).toBe(petPayload.name);
  });

  it("medical record flow (prepare -> create -> review)", async () => {
    const ownerSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.OWNER, label: "owner-medical" })
    );
    const clinicSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.CLINIC, label: "clinic-medical" })
    );

    const { petId } = await registerPetFlow({
      app,
      ownerToken: ownerSession.token,
      petPayload: {
        name: "Luna",
        species: "Anjing",
        breed: "Beagle",
        birth_date: "2024-03-09",
        color: "Brown White",
        physical_mark: "Bercak putih di kaki",
      },
      txHash: "0xpet-flow-002",
    });

    const { recordId, record } = await createMedicalRecordFlow({
      app,
      clinicToken: clinicSession.token,
      petId,
      payload: {
        vaccine_type: "Rabies",
        batch_number: "RB-2026-001",
        given_at: "2026-01-02",
        notes: "Dosis pertama",
        evidence_url: "https://example.com/rabies-evidence",
      },
      txHash: "0xmedical-flow-001",
    });

    expect(record.status).toBe("PENDING");

    const reviewed = await reviewMedicalRecordFlow({
      app,
      clinicToken: clinicSession.token,
      recordId,
      status: MedicalRecordStatus.VERIFIED,
      txHash: "0xmedical-review-001",
    });

    expect(reviewed.status).toBe("VERIFIED");

    const listedRecords = await request(app)
      .get(`/pets/${petId}/medical-records`)
      .set("Authorization", `Bearer ${ownerSession.token}`);
    expect(listedRecords.status).toBe(200);
    expect(listedRecords.body).toHaveLength(1);
    expect(listedRecords.body[0].status).toBe("VERIFIED");
  });

  it("transfer ownership flow + ownership history endpoint", async () => {
    const oldOwnerIdentity = makeIdentity({
      role: UserRole.OWNER,
      label: "owner-transfer-old",
    });
    const newOwnerIdentity = makeIdentity({
      role: UserRole.OWNER,
      label: "owner-transfer-new",
    });
    const oldOwnerSession = await registerAndLogin(app, oldOwnerIdentity);
    const newOwnerSession = await registerAndLogin(app, newOwnerIdentity);

    const { petId, publicId } = await registerPetFlow({
      app,
      ownerToken: oldOwnerSession.token,
      petPayload: {
        name: "Mochi",
        species: "Kucing",
        breed: "Maine Coon",
        birth_date: "2024-03-09",
        color: "White",
        physical_mark: "Telinga kiri bercak hitam",
      },
      txHash: "0xpet-transfer-001",
    });

    const transferResult = await transferOwnershipFlow({
      app,
      ownerToken: oldOwnerSession.token,
      petId,
      newOwnerEmail: newOwnerSession.email,
      txHash: "0xtransfer-flow-001",
    });

    expect(transferResult.message).toBe("Ownership transferred successfully");
    expect(transferResult.pet.ownerId).toBe(newOwnerSession.userId);
    expect(transferResult.blockchain.txHash).toBe("0xtransfer-flow-001");

    const acceptTransfer = await request(app)
      .post(`/pets/${petId}/transfer/accept`)
      .set("Authorization", `Bearer ${newOwnerSession.token}`)
      .send({});
    expect(acceptTransfer.status).toBe(200);
    expect(acceptTransfer.body.ownerId).toBe(newOwnerSession.userId);

    const ownershipHistory = await request(app)
      .get(`/pets/${petId}/ownership-history`)
      .set("Authorization", `Bearer ${newOwnerSession.token}`);
    expect(ownershipHistory.status).toBe(200);
    expect(ownershipHistory.body.view).toBe("dashboard_internal");
    expect(ownershipHistory.body.total).toBe(1);
    expect(ownershipHistory.body.items).toHaveLength(1);
    expect(ownershipHistory.body.items[0].txHash).toBe("0xtransfer-flow-001");
    expect(ownershipHistory.body.items[0].status).toBe("COMPLETED");

    const trace = await request(app).get(`/trace/${publicId}`);
    expect(trace.status).toBe(200);
    expect(trace.body.ownershipHistory.view).toBe("trace_public");
    expect(trace.body.ownershipHistory.total).toBe(1);

    const publicTraceItem = trace.body.ownershipHistory.items[0] as {
      fromOwner: { name: string; wallet: string | null; email?: string };
      toOwner: { name: string; wallet: string | null; email?: string };
      requestedAt: string;
      transferredAt: string | null;
      status: "PENDING" | "COMPLETED";
    };
    expect(publicTraceItem.fromOwner.name).not.toBe(oldOwnerIdentity.name);
    expect(publicTraceItem.toOwner.name).not.toBe(newOwnerIdentity.name);
    expect(publicTraceItem.fromOwner.wallet).toBe(
      maskWalletForExpectation(oldOwnerSession.walletAddress)
    );
    expect(publicTraceItem.toOwner.wallet).toBe(
      maskWalletForExpectation(newOwnerSession.walletAddress)
    );
    expect(publicTraceItem.fromOwner.email).toBeUndefined();
    expect(publicTraceItem.toOwner.email).toBeUndefined();

    const serializedTrace = JSON.stringify(trace.body);
    expect(serializedTrace).not.toContain(oldOwnerIdentity.email);
    expect(serializedTrace).not.toContain(newOwnerIdentity.email);
    expect(serializedTrace).not.toContain(oldOwnerSession.walletAddress);
    expect(serializedTrace).not.toContain(newOwnerSession.walletAddress);
  });
});
