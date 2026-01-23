export enum UserRole {
  OWNER = "OWNER",
  CLINIC = "CLINIC",
  ADMIN = "ADMIN",
  PUBLIC_VERIFIER = "PUBLIC_VERIFIER",
}

export enum PetStatus {
  REGISTERED = "REGISTERED",
  TRANSFER_PENDING = "TRANSFER_PENDING",
  INACTIVE = "INACTIVE",
}

export enum MedicalRecordStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export enum CorrectionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}
