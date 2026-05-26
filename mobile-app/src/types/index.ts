export type UserRole = 'administrador' | 'lector';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  nombre: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Medidor {
  codigo: string;
  numeroSerie: string;
  mac?: string;
  modelo?: string;
  estado?: string;
  distrito?: string;
  zona?: string;
  tarifaAlias?: string;
  lat?: number;
  lon?: number;
  numeroContrato?: string;
  contrato?: {
    numero: string;
    titular: string;
    direccion: string;
    distrito: string;
    zona: string;
    tarifa: string;
  };
  lecturaActual?: number;
  lecturaAnterior?: number;
  consumoParcial?: number;
}

export interface LecturaHistorial {
  fechaHora: string;
  periodo?: string;
  lecturaM3: number;
  consumo: number;
  status?: number;
  observaciones?: string;
}

export interface DashboardData {
  fecha: string;
  periodo: string;
  lecturasDelDia: number;
  medidoresActivos: number;
  medidoresPendientes: number;
  consumoPromedioM3: number;
  alertas: string[];
  sincronizacion: { estado: string; ultimaActualizacion: string };
}

export interface Tarifa {
  alias: string;
  categoria: string;
  descripcion: string;
  consumoMinimoM3: number;
  cargoFijo: number;
  rangos: Record<string, number>;
}

export interface LorawanReading {
  codigo_medidor: string;
  fecha: string;
  consumo_dia: number;
  consumo_acumulado: number;
  perfil?: string;
  tecnologia?: string;
  rssi?: number;
  snr?: number;
}

export interface PendingLectura {
  id: string;
  codigo_medidor: string;
  lectura_m3: number;
  observaciones?: string;
  lat?: number;
  lon?: number;
  fecha_hora: string;
  usuario?: string;
}
