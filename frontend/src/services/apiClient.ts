import axios from 'axios';
import type {
  AuthResponse,
  CorrectionRequest,
  MedicalRecord,
  Notification,
  OwnershipHistory,
  Pet,
  TraceResult,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
});

const TOKEN_KEY = 'petid_token';

const getToken = () => localStorage.getItem(TOKEN_KEY);

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export const medicalRecordApi = {
  list: async (petId: string) => {
    const { data } = await api.get<MedicalRecord[]>(`/pets/${petId}/medical-records`);
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

export const traceApi = {
  getByPublicId: async (publicId: string) => {
    const { data } = await api.get<TraceResult>(`/trace/${publicId}`);
    return data;
  },
};

export const statsApi = {
  adminSummary: async () => {
    const { data } = await api.get('/admin/summary');
    return data;
  },
};
