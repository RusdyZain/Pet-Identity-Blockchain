import "reflect-metadata";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppDataSource } from "../../src/config/dataSource";
import { ENV } from "../../src/config/env";
import { ensureSchema } from "../../src/config/ensureSchema";
import { OwnershipHistory } from "../../src/entities/OwnershipHistory";
import { runVaccineReminderJob } from "../../src/services/vaccineReminderScheduler";
import {
  MedicalRecordStatus,
  NotificationEventType,
  PetStatus,
  UserRole,
} from "../../src/types/enums";
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
const DAY_MS = 24 * 60 * 60 * 1000;

const maskWalletForExpectation = (walletAddress: string) =>
  `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

const listNotifications = async (
  token: string,
  query?: Record<string, string | number | boolean>
) =>
  request(app)
    .get("/notifications")
    .set("Authorization", `Bearer ${token}`)
    .query(query ?? {});

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

  it("notifies reviewers when owner submits correction request", async () => {
    const ownerSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.OWNER, label: "owner-correction-notif" })
    );
    const clinicSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.CLINIC, label: "clinic-correction-notif" })
    );

    const { petId } = await registerPetFlow({
      app,
      ownerToken: ownerSession.token,
      petPayload: {
        name: "Bobby",
        species: "Anjing",
        breed: "Pomeranian",
        birth_date: "2024-02-05",
        color: "Putih",
        physical_mark: "Leher coklat",
      },
      txHash: "0xpet-correction-notif-001",
    });

    const submitCorrection = await request(app)
      .post(`/pets/${petId}/corrections`)
      .set("Authorization", `Bearer ${ownerSession.token}`)
      .send({
        field_name: "color",
        new_value: "Putih Coklat",
        reason: "Warna dominan berubah",
      });
    expect(submitCorrection.status).toBe(201);

    const clinicNotifications = await listNotifications(clinicSession.token, {
      eventType: NotificationEventType.CORRECTION_SUBMITTED,
      page: 1,
      limit: 10,
    });
    expect(clinicNotifications.status).toBe(200);
    expect(clinicNotifications.body.meta.total).toBeGreaterThan(0);
    expect(clinicNotifications.body.items[0].eventType).toBe(
      NotificationEventType.CORRECTION_SUBMITTED
    );
    expect(clinicNotifications.body.items[0].petId).toBe(petId);
  });

  it("notifies owner when medical record is created with pending status", async () => {
    const ownerSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.OWNER, label: "owner-medical-pending" })
    );
    const clinicSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.CLINIC, label: "clinic-medical-pending" })
    );

    const { petId } = await registerPetFlow({
      app,
      ownerToken: ownerSession.token,
      petPayload: {
        name: "Nala",
        species: "Kucing",
        breed: "Persian",
        birth_date: "2024-01-01",
        color: "Abu",
        physical_mark: "Hidung hitam",
      },
      txHash: "0xpet-medical-pending-001",
    });

    const { recordId } = await createMedicalRecordFlow({
      app,
      clinicToken: clinicSession.token,
      petId,
      payload: {
        vaccine_type: "Rabies",
        batch_number: "RB-2026-777",
        given_at: "2026-03-12",
      },
      txHash: "0xmedical-pending-001",
    });
    expect(recordId).toBeGreaterThan(0);

    const ownerNotifications = await listNotifications(ownerSession.token, {
      eventType: NotificationEventType.MEDICAL_RECORD_PENDING,
      page: 1,
      limit: 10,
    });
    expect(ownerNotifications.status).toBe(200);
    expect(ownerNotifications.body.meta.total).toBeGreaterThan(0);
    expect(ownerNotifications.body.items[0].eventType).toBe(
      NotificationEventType.MEDICAL_RECORD_PENDING
    );
    expect(ownerNotifications.body.items[0].petId).toBe(petId);
  });

  it("supports transfer reject flow and sends notification", async () => {
    const oldOwnerSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.OWNER, label: "owner-transfer-reject-old" })
    );
    const newOwnerSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.OWNER, label: "owner-transfer-reject-new" })
    );

    const { petId } = await registerPetFlow({
      app,
      ownerToken: oldOwnerSession.token,
      petPayload: {
        name: "Taro",
        species: "Anjing",
        breed: "Shiba",
        birth_date: "2024-01-21",
        color: "Coklat",
        physical_mark: "Bercak putih dada",
      },
      txHash: "0xpet-transfer-reject-001",
    });

    await AppDataSource.getRepository(OwnershipHistory).save({
      petId,
      fromOwnerId: oldOwnerSession.userId,
      toOwnerId: newOwnerSession.userId,
      onChainPetId: null,
      txHash: null,
      blockNumber: null,
      blockTimestamp: null,
      transferredAt: null,
    });
    await AppDataSource.getRepository("pets").update(
      { id: petId },
      { status: PetStatus.TRANSFER_PENDING }
    );

    const rejectResponse = await request(app)
      .post(`/pets/${petId}/transfer/reject`)
      .set("Authorization", `Bearer ${newOwnerSession.token}`)
      .send({});
    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.status).toBe(PetStatus.REGISTERED);
    expect(rejectResponse.body.ownerId).toBe(oldOwnerSession.userId);

    const pendingHistory = await AppDataSource.getRepository(OwnershipHistory).find({
      where: {
        petId,
        toOwnerId: newOwnerSession.userId,
      },
    });
    expect(pendingHistory).toHaveLength(0);

    const oldOwnerNotifications = await listNotifications(oldOwnerSession.token, {
      eventType: NotificationEventType.TRANSFER_REJECTED,
      page: 1,
      limit: 10,
    });
    expect(oldOwnerNotifications.status).toBe(200);
    expect(oldOwnerNotifications.body.meta.total).toBeGreaterThan(0);

    const newOwnerNotifications = await listNotifications(newOwnerSession.token, {
      eventType: NotificationEventType.TRANSFER_REJECTED,
      page: 1,
      limit: 10,
    });
    expect(newOwnerNotifications.status).toBe(200);
    expect(newOwnerNotifications.body.meta.total).toBeGreaterThan(0);
  });

  it("can mark notification as read", async () => {
    const ownerSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.OWNER, label: "owner-mark-read" })
    );
    const clinicSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.CLINIC, label: "clinic-mark-read" })
    );

    const { petId } = await registerPetFlow({
      app,
      ownerToken: ownerSession.token,
      petPayload: {
        name: "Mimi",
        species: "Kucing",
        breed: "Anggora",
        birth_date: "2024-02-09",
        color: "Putih",
        physical_mark: "Ekor panjang",
      },
      txHash: "0xpet-mark-read-001",
    });

    await createMedicalRecordFlow({
      app,
      clinicToken: clinicSession.token,
      petId,
      payload: {
        vaccine_type: "Rabies",
        batch_number: "RB-2026-551",
        given_at: "2026-02-12",
      },
      txHash: "0xmedical-mark-read-001",
    });

    const unreadList = await listNotifications(ownerSession.token, {
      eventType: NotificationEventType.MEDICAL_RECORD_PENDING,
      isRead: false,
      page: 1,
      limit: 10,
    });
    expect(unreadList.status).toBe(200);
    expect(unreadList.body.items.length).toBeGreaterThan(0);
    const notificationId = unreadList.body.items[0].id as number;

    const markRead = await request(app)
      .patch(`/notifications/${notificationId}/read`)
      .set("Authorization", `Bearer ${ownerSession.token}`)
      .send({});
    expect(markRead.status).toBe(200);
    expect(markRead.body.isRead).toBe(true);
    expect(markRead.body.readAt).toBeTruthy();

    const readList = await listNotifications(ownerSession.token, {
      eventType: NotificationEventType.MEDICAL_RECORD_PENDING,
      isRead: true,
      page: 1,
      limit: 10,
    });
    expect(readList.status).toBe(200);
    expect(
      readList.body.items.some((item: { id: number }) => item.id === notificationId)
    ).toBe(true);
  });

  it("vaccine reminder scheduler remains working and deduplicated", async () => {
    const ownerSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.OWNER, label: "owner-reminder" })
    );
    const clinicSession = await registerAndLogin(
      app,
      makeIdentity({ role: UserRole.CLINIC, label: "clinic-reminder" })
    );

    const { petId } = await registerPetFlow({
      app,
      ownerToken: ownerSession.token,
      petPayload: {
        name: "Cici",
        species: "Anjing",
        breed: "Corgi",
        birth_date: "2024-03-11",
        color: "Cream",
        physical_mark: "Bintik hidung",
      },
      txHash: "0xpet-reminder-001",
    });

    const dueAfterDays = Math.max(1, Math.floor(ENV.vaccineReminderDueAfterDays));
    const givenAtDate = new Date(Date.now() - dueAfterDays * DAY_MS);
    const givenAt = givenAtDate.toISOString().slice(0, 10);

    const { recordId } = await createMedicalRecordFlow({
      app,
      clinicToken: clinicSession.token,
      petId,
      payload: {
        vaccine_type: "Rabies",
        batch_number: "RB-2026-999",
        given_at: givenAt,
      },
      txHash: "0xmedical-reminder-001",
    });

    await reviewMedicalRecordFlow({
      app,
      clinicToken: clinicSession.token,
      recordId,
      status: MedicalRecordStatus.VERIFIED,
      txHash: "0xmedical-reminder-verify-001",
    });

    await runVaccineReminderJob();
    await runVaccineReminderJob();

    const reminderNotifications = await listNotifications(ownerSession.token, {
      eventType: NotificationEventType.VACCINE_REMINDER,
      page: 1,
      limit: 20,
    });
    expect(reminderNotifications.status).toBe(200);
    expect(reminderNotifications.body.meta.total).toBe(1);
    expect(reminderNotifications.body.items[0].eventType).toBe(
      NotificationEventType.VACCINE_REMINDER
    );
  });
});
