import Constants from 'expo-constants';

/**
 * API móvil: Go en :8090 (backend-go) o Node en :8080 (mismo contrato /api).
 * En .env usa la IP de tu PC en WiFi.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.1.100:8080/api';
