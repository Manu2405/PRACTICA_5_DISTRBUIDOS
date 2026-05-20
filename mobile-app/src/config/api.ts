import Constants from 'expo-constants';

/**
 * API móvil SEMAPA.
 * Default: Node en :8080 (mismo contrato /api). Go en :8090 disponible si está corriendo.
 * Configurar EXPO_PUBLIC_API_URL en .env con la IP Wi-Fi del PC (no localhost en móvil físico).
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.1.100:8080/api';
