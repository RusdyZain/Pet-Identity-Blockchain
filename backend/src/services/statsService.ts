import { Not, IsNull } from "typeorm";
import { AppDataSource } from "../config/dataSource";
import { Pet } from "../entities/Pet";
import { MedicalRecord } from "../entities/MedicalRecord";
import { OwnershipHistory } from "../entities/OwnershipHistory";

// Ringkasan statistik admin untuk dashboard.
export const getAdminSummary = async () => {
  const [totalPets, totalMedicalRecords, totalTransfers] = await Promise.all([
    AppDataSource.getRepository(Pet).count(),
    AppDataSource.getRepository(MedicalRecord).count(),
    AppDataSource.getRepository(OwnershipHistory).count({
      where: { transferredAt: Not(IsNull()) },
    }),
  ]);

  return {
    totalPets,
    totalMedicalRecords,
    totalTransfers,
  };
};
