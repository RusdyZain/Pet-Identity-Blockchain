import { describe, expect, it, vi } from "vitest";
import {
  buildDueVaccineReminders,
  runVaccineReminderJobCore,
  type LatestVerifiedVaccineRecord,
  type ReminderJobConfig,
} from "../../src/services/vaccineReminderScheduler";

const BASE_CONFIG: ReminderJobConfig = {
  dueAfterDays: 365,
  lookaheadDays: 14,
  overdueLookbackDays: 30,
  now: new Date("2026-04-18T12:00:00.000Z"),
};

const makeRecord = (params: {
  petId: number;
  ownerId: number;
  petName: string;
  vaccineType: string;
  givenAt: string;
}): LatestVerifiedVaccineRecord => ({
  petId: params.petId,
  ownerId: params.ownerId,
  petName: params.petName,
  vaccineType: params.vaccineType,
  givenAt: new Date(params.givenAt),
});

describe("vaccineReminderScheduler buildDueVaccineReminders", () => {
  it("memilih record terbaru per pet + vaccine type dan memfilter jendela due", () => {
    const records: LatestVerifiedVaccineRecord[] = [
      makeRecord({
        petId: 1,
        ownerId: 10,
        petName: "Milo",
        vaccineType: "Rabies",
        givenAt: "2024-04-25T00:00:00.000Z",
      }),
      makeRecord({
        petId: 1,
        ownerId: 10,
        petName: "Milo",
        vaccineType: "rabies",
        givenAt: "2025-04-25T00:00:00.000Z",
      }),
      makeRecord({
        petId: 1,
        ownerId: 10,
        petName: "Milo",
        vaccineType: "DHPP",
        givenAt: "2025-04-01T00:00:00.000Z",
      }),
      makeRecord({
        petId: 2,
        ownerId: 20,
        petName: "Luna",
        vaccineType: "Rabies",
        givenAt: "2025-02-01T00:00:00.000Z",
      }),
      makeRecord({
        petId: 3,
        ownerId: 30,
        petName: "Coco",
        vaccineType: "Rabies",
        givenAt: "2025-05-20T00:00:00.000Z",
      }),
    ];

    const reminders = buildDueVaccineReminders(records, BASE_CONFIG);

    expect(reminders).toHaveLength(2);
    expect(reminders.map((item) => ({
      petId: item.petId,
      vaccineType: item.vaccineType,
      dueDate: item.dueDate.toISOString().slice(0, 10),
      daysUntilDue: item.daysUntilDue,
    }))).toEqual([
      {
        petId: 1,
        vaccineType: "DHPP",
        dueDate: "2026-04-01",
        daysUntilDue: -17,
      },
      {
        petId: 1,
        vaccineType: "rabies",
        dueDate: "2026-04-25",
        daysUntilDue: 7,
      },
    ]);
  });
});

describe("vaccineReminderScheduler runVaccineReminderJobCore", () => {
  it("idempotent: notifikasi tidak dikirim ulang jika dedupe log sudah ada", async () => {
    const records: LatestVerifiedVaccineRecord[] = [
      makeRecord({
        petId: 11,
        ownerId: 101,
        petName: "Mochi",
        vaccineType: "Rabies",
        givenAt: "2025-04-28T00:00:00.000Z",
      }),
    ];

    const sentKeys = new Set<string>();
    const notify = vi.fn(async () => undefined);
    const tryCreateReminderLog = vi.fn(
      async (params: {
        petId: number;
        ownerId: number;
        vaccineType: string;
        dueDate: Date;
      }) => {
        const key = `${params.petId}:${params.vaccineType.toLowerCase()}:${params.dueDate.toISOString().slice(0, 10)}`;
        if (sentKeys.has(key)) {
          return false;
        }
        sentKeys.add(key);
        return true;
      }
    );

    const firstRun = await runVaccineReminderJobCore(BASE_CONFIG, {
      getLatestVerifiedRecords: async () => records,
      tryCreateReminderLog,
      notify,
    });

    const secondRun = await runVaccineReminderJobCore(BASE_CONFIG, {
      getLatestVerifiedRecords: async () => records,
      tryCreateReminderLog,
      notify,
    });

    expect(firstRun.notificationsSent).toBe(1);
    expect(secondRun.notificationsSent).toBe(0);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(tryCreateReminderLog).toHaveBeenCalledTimes(2);
  });
});
