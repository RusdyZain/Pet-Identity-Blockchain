import axios from 'axios';
import type {
  AdminPet,
  AdminUser,
  AuthResponse,
  CorrectionRequest,
  MedicalRecord,
  Notification,
  OwnershipHistory,
  OwnerProfile,
  Pet,
  TraceResult,
} from '../types';

// Base URL API dari environment, fallback ke localhost.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Instance axios tunggal agar konfigurasi konsisten.
const api = axios.create({
  baseURL: API_URL,
});

// Kunci token di localStorage.
const TOKEN_KEY = 'petid_token';

// Helper ambil token saat ini.
const getToken = () => localStorage.getItem(TOKEN_KEY);

// Tambahkan header Authorization otomatis untuk setiap request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API autentikasi (login, register, logout).
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },
  register: async (payload: { name: string; email: string; password: string; role: string }) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
  },
};

// API akun owner (profil sendiri).
export const ownerAccountApi = {
  profile: async () => {
    const { data } = await api.get<OwnerProfile>('/owners/me');
    return data;
  },
  update: async (payload: { name?: string; email?: string; password?: string }) => {
    const { data } = await api.patch<OwnerProfile>('/owners/me', payload);
    return data;
  },
  remove: async () => {
    const { data } = await api.delete<{ message: string }>('/owners/me');
    return data;
  },
};

// API untuk data hewan dan alur kepemilikan.
export const petApi = {
  list: async (params?: { search?: string }) => {
    const { data } = await api.get<Pet[]>('/pets', { params });
    return data;
  },
  create: async (payload: {
    name: string;
    species: string;
    breed: string;
    birth_date: string;
    color: string;
    physical_mark: string;
  }) => {
    const { data } = await api.post<Pet>('/pets', payload);
    return data;
  },
  detail: async (petId: string) => {
    const { data } = await api.get<Pet>(`/pets/${petId}`);
    return data;
  },
  ownershipHistory: async (petId: string) => {
    const { data } = await api.get<OwnershipHistory[]>(`/pets/${petId}/ownership-history`);
    return data;
  },
  initiateTransfer: async (petId: string, newOwnerEmail: string) => {
    const { data } = await api.post(`/pets/${petId}/transfer`, {
      new_owner_email: newOwnerEmail,
    });
    return data;
  },
  acceptTransfer: async (petId: string) => {
    const { data } = await api.post(`/pets/${petId}/transfer/accept`, {});
    return data;
  },
};

// API catatan medis / vaksin.
export const medicalRecordApi = {
  list: async (petId: string) => {
    const { data } = await api.get<MedicalRecord[]>(`/pets/${petId}/medical-records`);
    return data;
  },
  pending: async () => {
    const { data } = await api.get<MedicalRecord[]>(`/medical-records/pending`);
    return data;
  },
  create: async (
    petId: string,
    payload: {
      vaccine_type: string;
      batch_number: string;
      given_at: string;
      notes?: string;
      evidence_url?: string;
    },
  ) => {
    const { data } = await api.post<MedicalRecord>(`/pets/${petId}/medical-records`, payload);
    return data;
  },
  verify: async (recordId: string, status: 'VERIFIED' | 'REJECTED') => {
    const { data } = await api.patch<MedicalRecord>(`/medical-records/${recordId}/verify`, {
      status,
    });
    return data;
  },
};

// API koreksi data dari pemilik.
export const correctionApi = {
  create: async (
    petId: string,
    payload: { field_name: string; new_value: string; reason?: string },
  ) => {
    const { data } = await api.post(`/pets/${petId}/corrections`, payload);
    return data;
  },
  list: async (status?: string) => {
    const { data } = await api.get<CorrectionRequest[]>('/corrections', {
      params: { status },
    });
    return data;
  },
  review: async (
    id: string,
    payload: { status: 'APPROVED' | 'REJECTED'; reason?: string },
  ) => {
    const { data } = await api.patch(`/corrections/${id}`, payload);
    return data;
  },
};

// API notifikasi untuk user.
export const notificationApi = {
  list: async () => {
    const { data } = await api.get<Notification[]>('/notifications');
    return data;
  },
  markRead: async (id: string) => {
    const { data } = await api.patch(`/notifications/${id}/read`, {});
    return data;
  },
};

// API trace publik berbasis public ID.
export const traceApi = {
  getByPublicId: async (publicId: string) => {
    const { data } = await api.get<TraceResult>(`/trace/${publicId}`);
    return data;
  },
};

// API statistik admin.
export const statsApi = {
  adminSummary: async () => {
    const { data } = await api.get('/admin/summary');
    return data;
  },
};

// API admin untuk kelola akun dan daftar hewan.
export const adminApi = {
  listUsers: async (params?: { role?: string; search?: string }) => {
    const { data } = await api.get<AdminUser[]>('/admin/users', { params });
    return data;
  },
  createUser: async (payload: { name: string; email: string; password: string; role: string }) => {
    const { data } = await api.post<AdminUser>('/admin/users', payload);
    return data;
  },
  updateUser: async (
    id: number,
    payload: { name?: string; email?: string; password?: string; role?: string },
  ) => {
    const { data } = await api.patch<AdminUser>(`/admin/users/${id}`, payload);
    return data;
  },
  deleteUser: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/admin/users/${id}`);
    return data;
  },
  listPets: async (params?: { search?: string }) => {
    const { data } = await api.get<AdminPet[]>('/admin/pets', { params });
    return data;
  },
};
