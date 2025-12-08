export type UserRole = 'OWNER' | 'CLINIC' | 'ADMIN' | 'PUBLIC_VERIFIER';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface Pet {
  id: number;
  publicId: string;
  name: string;
  species: string;
  breed: string;
  birthDate: string;
  age?: number | null;
  color: string;
  physicalMark: string;
  status: 'REGISTERED' | 'TRANSFER_PENDING' | 'INACTIVE';
}

export interface MedicalRecord {
  id: number;
  vaccineType: string;
  batchNumber: string;
  givenAt: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  clinic?: { name: string };
  notes?: string | null;
  evidenceUrl?: string | null;
}

export interface CorrectionRequest {
  id: number;
  petId: number;
  fieldName: string;
  oldValue: string;
  newValue: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string | null;
}

export interface OwnershipHistory {
  id: number;
  fromOwner: { name: string };
  toOwner: { name: string };
  transferredAt: string | null;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface TraceResult {
  name: string;
  species: string;
  breed: string;
  ownerName: string;
  vaccines: Array<{ vaccineType: string; lastGivenAt: string; status: string }>;
}
