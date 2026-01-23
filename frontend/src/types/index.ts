// Role akses yang menentukan halaman dashboard yang boleh dibuka pengguna.
export type UserRole = 'OWNER' | 'CLINIC' | 'ADMIN' | 'PUBLIC_VERIFIER';

// Data user yang disimpan di front-end setelah login.
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
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
  fieldName: string;
  oldValue: string;
  newValue: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string | null;
}

// Riwayat perpindahan kepemilikan hewan.
export interface OwnershipHistory {
  id: number;
  fromOwner: { name: string };
  toOwner: { name: string };
  transferredAt: string | null;
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
  name: string;
  species: string;
  breed: string;
  ownerName: string;
  vaccines: Array<{ vaccineType: string; lastGivenAt: string; status: string }>;
}
