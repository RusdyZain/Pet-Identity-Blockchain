import { prisma } from "../config/prisma";

// Ringkasan statistik admin untuk dashboard.
export const getAdminSummary = async () => {
  const [totalPets, totalMedicalRecords, totalTransfers] = await Promise.all([
    prisma.pet.count(),
    prisma.medicalRecord.count(),
    prisma.ownershipHistory.count({ where: { transferredAt: { not: null } } }),
  ]);

  return {
    totalPets,
    totalMedicalRecords,
    totalTransfers,
  };
};
