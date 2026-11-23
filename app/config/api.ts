import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Returns the active hostname (LAN IP address or localhost) for the backend service.
 */
export function getHostIp(): string {
  // 1. Web Environment: Dynamically use current browser window hostname (e.g. 192.168.68.105 or localhost)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return window.location.hostname || 'localhost';
  }

  // 2. React Native iOS/Android (Expo Go / Dev Client):
  // Extract LAN IP from Metro server hostUri provided by Expo Constants
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      (Constants.manifest as any)?.debuggerHost;

    if (hostUri) {
      const lanIp = hostUri.split(':')[0];
      if (lanIp) {
        return lanIp;
      }
    }
  } catch (err) {
    console.warn('[API Config] Error resolving host from Constants:', err);
  }

  // 3. Fallback to localhost
  return 'localhost';
}

/**
 * Returns the base URL of the backend server (e.g., http://192.168.68.105:5000 or http://localhost:5000)
 */
export function getServerBaseUrl(port: number = 5000): string {
  const host = getHostIp();
  return `http://${host}:${port}`;
}

/**
 * Returns the dynamic API Base URL (e.g., http://192.168.68.105:5000/api)
 */
export function getApiBaseUrl(): string {
  return `${getServerBaseUrl()}/api`;
}

/**
 * Resolves static or uploaded file URLs (student photos, documents, PDF downloads)
 * dynamically against the active LAN host.
 */
export function resolveFileUrl(filePath?: string | null): string {
  if (!filePath) return '';
  // If already absolute URL or data URI, return directly
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
    return filePath;
  }
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${getServerBaseUrl()}${cleanPath}`;
}

export const API_BASE_URL = getApiBaseUrl();

export default {
  getHostIp,
  getServerBaseUrl,
  getApiBaseUrl,
  resolveFileUrl,
  API_BASE_URL
};
