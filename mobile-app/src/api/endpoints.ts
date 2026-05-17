import { api } from './client';
import type {
  AuthResponse,
  DashboardData,
  LecturaHistorial,
  LorawanReading,
  Medidor,
  Tarifa,
  User,
} from '../types';

export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { username, password }).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string }>('/auth/refresh', { refreshToken }).then((r) => r.data),
};

export const medidoresApi = {
  list: (params?: { limit?: number; estado?: string }) =>
    api.get<Medidor[]>('/medidores', { params }).then((r) => r.data),
  get: (codigo: string, periodo?: string) =>
    api.get<Medidor>(`/medidores/${codigo}`, { params: { periodo } }).then((r) => r.data),
};

export const lecturasApi = {
  registrar: (body: {
    codigo_medidor: string;
    lectura_m3: number;
    observaciones?: string;
    lat?: number;
    lon?: number;
    fecha_hora?: string;
  }) => api.post('/lecturas', body).then((r) => r.data),
  historial: (params: { codigo_medidor: string; periodo?: string; desde?: string; hasta?: string }) =>
    api
      .get<{ codigo_medidor: string; historial: LecturaHistorial[] }>('/lecturas/historial', { params })
      .then((r) => r.data),
};

export const tarifasApi = {
  list: (categoria?: string) =>
    api.get<Tarifa[]>('/tarifas', { params: { categoria } }).then((r) => r.data),
  calcular: (body: {
    consumo_m3?: number;
    tarifa_alias?: string;
    numero_contrato?: string;
    medidores?: { codigo: string; consumoM3: number }[];
  }) => api.post('/calcular-factura', body).then((r) => r.data),
};

export const dashboardApi = {
  get: () => api.get<DashboardData>('/mobile/dashboard').then((r) => r.data),
};

export const lorawanApi = {
  simular: (body: { codigo_medidor: string; perfil?: string; fecha?: string }) =>
    api.post<LorawanReading>('/lorawan/simular', body).then((r) => r.data),
  simularBatch: (body: { medidores?: string[]; perfil?: string }) =>
    api.post<{ cantidad: number; lecturas: LorawanReading[] }>('/lorawan/simular-batch', body).then((r) => r.data),
};

export type { User };
