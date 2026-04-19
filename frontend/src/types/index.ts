// Role akses yang menentukan halaman dashboard yang boleh dibuka pengguna.
export type UserRole = 'OWNER' | 'CLINIC' | 'ADMIN' | 'PUBLIC_VERIFIER';

// Data user yang disimpan di front-end setelah login.
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  walletAddress?: string | null;
}

// Bentuk respons login yang membawa token dan profil pengguna.
export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// Profil akun owner untuk halaman pengelolaan akun.
export interface OwnerProfile extends AuthUser {
  walletAddress?: string | null;
}

// Data akun untuk admin management.
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  walletAddress?: string | null;
}

// Data hewan untuk admin (termasuk pemilik).
export interface AdminPet extends Pet {
  owner?: { id: number; name: string; email: string };
}

// Data utama hewan yang dipakai di dashboard pemilik/klinik.
export interface Pet {
  id: number;
  publicId: string;
  onChainPetId?: number | null;
  dataHash?: string | null;
  txHash?: string | null;
  blockNumber?: number | null;
  blockTimestamp?: string | null;
  name: string;
  species: string;
  breed: string;
  birthDate: string;
  age?: number | null;
  color: string;
  physicalMark: string;
  status: 'REGISTERED' | 'TRANSFER_PENDING' | 'INACTIVE';
}

// Catatan vaksinasi/medis untuk satu hewan.
export interface MedicalRecord {
  id: number;
  onChainRecordId?: number | null;
  dataHash?: string | null;
  txHash?: string | null;
  blockNumber?: number | null;
  blockTimestamp?: string | null;
  vaccineType: string;
  batchNumber: string;
  givenAt: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  clinic?: { name: string };
  pet?: { id: number; name: string; publicId: string };
  notes?: string | null;
  evidenceUrl?: string | null;
}

// Permintaan koreksi data dari pemilik hewan.
export interface CorrectionRequest {
  id: number;
  petId: number;
  dataHash?: string | null;
  txHash?: string | null;
  blockNumber?: number | null;
  blockTimestamp?: string | null;
  fieldName: string;
  oldValue: string;
  newValue: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string | null;
}

// Item riwayat perpindahan kepemilikan untuk dashboard internal.
export interface OwnershipHistoryItem {
  id: number;
  petId: number;
  onChainPetId?: number | null;
  fromOwner: { id: number | null; name: string; email: string };
  toOwner: { id: number | null; name: string; email: string };
  requestedAt: string;
  status: 'PENDING' | 'COMPLETED';
  txHash?: string | null;
  blockNumber?: number | null;
  blockTimestamp?: string | null;
  transferredAt: string | null;
}

export interface OwnershipHistoryDashboardResponse {
  view: 'dashboard_internal';
  petId: number;
  total: number;
  items: OwnershipHistoryItem[];
}

// Notifikasi yang dikirim sistem kepada user.
export interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// Data trace publik untuk verifikasi identitas hewan.
export interface TraceResult {
  publicId: string;
  name: string;
  species: string;
  breed: string;
  ownerName: string;
  vaccines: Array<{ vaccineType: string; lastGivenAt: string; status: string }>;
  ownershipHistory: {
    view: 'trace_public';
    total: number;
    items: Array<{
      fromOwner: { name: string; wallet: string | null };
      toOwner: { name: string; wallet: string | null };
      requestedAt: string;
      transferredAt: string | null;
      status: 'PENDING' | 'COMPLETED';
    }>;
  };
}

export interface PreparedTxRequest {
  to: string;
  data: string;
}
