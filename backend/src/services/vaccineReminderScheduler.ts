import { ENV } from "../config/env";
import { AppDataSource } from "../config/dataSource";
import { MedicalRecord } from "../entities/MedicalRecord";
import { VaccineReminderLog } from "../entities/VaccineReminderLog";
import { MedicalRecordStatus, PetStatus } from "../types/enums";
import { createNotification } from "./notificationService";

export type LatestVerifiedVaccineRecord = {
  petId: number;
  ownerId: number;
  petName: string;
  vaccineType: string;
  givenAt: Date;
};

export type DueVaccineReminder = LatestVerifiedVaccineRecord & {
  dueDate: Date;
  daysUntilDue: number;
};

export type ReminderJobConfig = {
  dueAfterDays: number;
  lookaheadDays: number;
  overdueLookbackDays: number;
  now: Date;
};

type ReminderJobDeps = {
  getLatestVerifiedRecords: () => Promise<LatestVerifiedVaccineRecord[]>;
  tryCreateReminderLog: (params: {
    petId: number;
    ownerId: number;
    vaccineType: string;
    dueDate: Date;
  }) => Promise<boolean>;
  notify: (params: { userId: number; title: string; message: string }) => Promise<unknown>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

let schedulerTimer: NodeJS.Timeout | null = null;
let isRunning = false;

const startOfTodayUtc = (baseDate = new Date()) =>
  new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate()
    )
  );

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * DAY_MS);

const toDateOnlyUtc = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const normalizeVaccineType = (vaccineType: string) => vaccineType.trim().toLowerCase();

const dateDiffInDays = (from: Date, to: Date) =>
  Math.round((toDateOnlyUtc(to).getTime() - toDateOnlyUtc(from).getTime()) / DAY_MS);

const getReminderMessage = (reminder: DueVaccineReminder) => {
  const dueDateIso = toIsoDate(reminder.dueDate);
  if (reminder.daysUntilDue < 0) {
    return `Vaksin ${reminder.vaccineType} untuk ${reminder.petName} sudah melewati jatuh tempo pada ${dueDateIso}.`;
  }
  if (reminder.daysUntilDue === 0) {
    return `Vaksin ${reminder.vaccineType} untuk ${reminder.petName} jatuh tempo hari ini (${dueDateIso}).`;
  }
  return `Vaksin ${reminder.vaccineType} untuk ${reminder.petName} jatuh tempo pada ${dueDateIso} (${reminder.daysUntilDue} hari lagi).`;
};

export const buildDueVaccineReminders = (
  records: LatestVerifiedVaccineRecord[],
  config: ReminderJobConfig
) => {
  const dueAfterDays = Math.max(1, Math.floor(config.dueAfterDays));
  const lookaheadDays = Math.max(1, Math.floor(config.lookaheadDays));
  const overdueLookbackDays = Math.max(0, Math.floor(config.overdueLookbackDays));
  const today = startOfTodayUtc(config.now);
  const windowStart = addDays(today, -overdueLookbackDays);
  const windowEnd = addDays(today, lookaheadDays);

  const latestByPetAndVaccine = new Map<string, LatestVerifiedVaccineRecord>();
  for (const record of records) {
    const normalizedVaccineType = normalizeVaccineType(record.vaccineType);
    if (!normalizedVaccineType) {
      continue;
    }

    const key = `${record.petId}:${normalizedVaccineType}`;
    const currentLatest = latestByPetAndVaccine.get(key);
    if (!currentLatest || currentLatest.givenAt.getTime() < record.givenAt.getTime()) {
      latestByPetAndVaccine.set(key, record);
    }
  }

  const dueReminders: DueVaccineReminder[] = [];
  for (const record of latestByPetAndVaccine.values()) {
    const dueDate = toDateOnlyUtc(addDays(record.givenAt, dueAfterDays));
    if (dueDate < windowStart || dueDate > windowEnd) {
      continue;
    }

    dueReminders.push({
      ...record,
      dueDate,
      daysUntilDue: dateDiffInDays(today, dueDate),
    });
  }

  dueReminders.sort((left, right) => {
    const dueDateDiff = left.dueDate.getTime() - right.dueDate.getTime();
    if (dueDateDiff !== 0) {
      return dueDateDiff;
    }

    const petDiff = left.petId - right.petId;
    if (petDiff !== 0) {
      return petDiff;
    }

    return left.vaccineType.localeCompare(right.vaccineType);
  });

  return dueReminders;
};

const getLatestVerifiedRecords = async (): Promise<LatestVerifiedVaccineRecord[]> => {
  const rows = await AppDataSource.getRepository(MedicalRecord)
    .createQueryBuilder("record")
    .innerJoin("record.pet", "pet")
    .select([
      "record.petId AS pet_id",
      "record.vaccineType AS vaccine_type",
      "record.givenAt AS given_at",
      "pet.ownerId AS owner_id",
      "pet.name AS pet_name",
    ])
    .where("record.status = :recordStatus", {
      recordStatus: MedicalRecordStatus.VERIFIED,
    })
    .andWhere("pet.status = :petStatus", { petStatus: PetStatus.REGISTERED })
    .orderBy("record.petId", "ASC")
    .addOrderBy("record.vaccineType", "ASC")
    .addOrderBy("record.givenAt", "DESC")
    .getRawMany<{
      pet_id: number | string;
      owner_id: number | string;
      pet_name: string;
      vaccine_type: string;
      given_at: Date | string;
    }>();

  const latestByPetAndVaccine = new Map<string, LatestVerifiedVaccineRecord>();
  for (const row of rows) {
    const petId = Number(row.pet_id);
    const ownerId = Number(row.owner_id);
    const givenAt = row.given_at instanceof Date ? row.given_at : new Date(row.given_at);
    const vaccineType = row.vaccine_type?.trim() ?? "";
    if (
      !Number.isInteger(petId) ||
      !Number.isInteger(ownerId) ||
      Number.isNaN(givenAt.getTime()) ||
      !vaccineType
    ) {
      continue;
    }

    const key = `${petId}:${normalizeVaccineType(vaccineType)}`;
    if (latestByPetAndVaccine.has(key)) {
      continue;
    }

    latestByPetAndVaccine.set(key, {
      petId,
      ownerId,
      petName: row.pet_name,
      vaccineType,
      givenAt,
    });
  }

  return Array.from(latestByPetAndVaccine.values());
};

const tryCreateReminderLog = async (params: {
  petId: number;
  ownerId: number;
  vaccineType: string;
  dueDate: Date;
}) => {
  const result = await AppDataSource.getRepository(VaccineReminderLog)
    .createQueryBuilder()
    .insert()
    .into(VaccineReminderLog)
    .values({
      petId: params.petId,
      ownerId: params.ownerId,
      vaccineType: params.vaccineType,
      dueDate: params.dueDate,
    })
    .orIgnore()
    .execute();

  return (result.raw?.rowCount ?? result.identifiers?.length ?? 0) > 0;
};

export const runVaccineReminderJobCore = async (
  config: ReminderJobConfig,
  deps: ReminderJobDeps
) => {
  const dueReminders = buildDueVaccineReminders(
    await deps.getLatestVerifiedRecords(),
    config
  );

  let notificationsSent = 0;
  for (const reminder of dueReminders) {
    const shouldSend = await deps.tryCreateReminderLog({
      petId: reminder.petId,
      ownerId: reminder.ownerId,
      vaccineType: reminder.vaccineType,
      dueDate: reminder.dueDate,
    });
    if (!shouldSend) {
      continue;
    }

    await deps.notify({
      userId: reminder.ownerId,
      title: "Reminder vaksin otomatis",
      message: getReminderMessage(reminder),
    });
    notificationsSent += 1;
  }

  return {
    considered: dueReminders.length,
    notificationsSent,
  };
};

const runVaccineReminderJobOnce = () =>
  runVaccineReminderJobCore(
    {
      dueAfterDays: ENV.vaccineReminderDueAfterDays,
      lookaheadDays: ENV.vaccineReminderLookaheadDays,
      overdueLookbackDays: ENV.vaccineReminderOverdueLookbackDays,
      now: new Date(),
    },
    {
      getLatestVerifiedRecords,
      tryCreateReminderLog,
      notify: createNotification,
    }
  );

export const runVaccineReminderJob = async () => {
  if (isRunning) {
    return;
  }
  isRunning = true;
  try {
    await runVaccineReminderJobOnce();
  } finally {
    isRunning = false;
  }
};

export const startVaccineReminderScheduler = () => {
  if (!ENV.vaccineReminderEnabled) {
    return;
  }
  if (schedulerTimer) {
    return;
  }

  void runVaccineReminderJob().catch((error) => {
    console.error("[vaccine-reminder] initial run failed", error);
  });

  const intervalMs = Math.max(60_000, Math.floor(ENV.vaccineReminderIntervalMs));
  schedulerTimer = setInterval(() => {
    void runVaccineReminderJob().catch((error) => {
      console.error("[vaccine-reminder] scheduled run failed", error);
    });
  }, intervalMs);
  if (typeof schedulerTimer.unref === "function") {
    schedulerTimer.unref();
  }
};

export const stopVaccineReminderScheduler = () => {
  if (!schedulerTimer) {
    return;
  }
  clearInterval(schedulerTimer);
  schedulerTimer = null;
};
