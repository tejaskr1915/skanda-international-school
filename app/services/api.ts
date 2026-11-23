// API Client for Skanda International School admissions & auth
import { Platform } from 'react-native';
import { getApiBaseUrl, getServerBaseUrl, resolveFileUrl } from '../config/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  public getBaseUrl(): string {
    return getApiBaseUrl();
  }

  public getServerUrl(): string {
    return getServerBaseUrl();
  }

  public resolveFileUrl(filePath?: string | null): string {
    return resolveFileUrl(filePath);
  }

  private loadToken() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      this.token = window.localStorage.getItem('skanda_token');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem('skanda_token', token);
      } else {
        window.localStorage.removeItem('skanda_token');
      }
    }
  }

  public getToken() {
    if (!this.token && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      this.token = window.localStorage.getItem('skanda_token');
    }
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.warn(`[API] ${options.method || 'GET'} ${endpoint} error:`, error.message);
      throw error;
    }
  }

  // --- Auth APIs ---
  async registerStep1(payload: {
    fullName: string;
    mobile: string;
    email: string;
    password: string;
  }) {
    const data = await this.request('/auth/register-step1', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async sendOtp(mobile: string) {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile })
    });
  }

  async verifyOtp(mobile: string, otp: string) {
    const data = await this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile, otp })
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async loginPassword(mobile: string, password: string) {
    const data = await this.request('/auth/login-password', {
      method: 'POST',
      body: JSON.stringify({ mobile, password })
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  // --- Applications APIs ---
  async getMe() {
    return this.request('/applications/me');
  }

  async statusLookup(applicationNo: string, mobile?: string) {
    return this.request('/applications/status-lookup', {
      method: 'POST',
      body: JSON.stringify({ applicationNo, mobile })
    });
  }

  async saveStep(stepNumber: number, payload: any) {
    return this.request(`/applications/step/${stepNumber}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async submitApplication() {
    return this.request('/applications/submit', {
      method: 'POST'
    });
  }

  // --- Academic Metadata ---
  async getAcademicMetadata() {
    return this.request('/academic/academic-metadata');
  }

  async getAcademicSubjects(classOrCourse: string, board?: string) {
    const query = new URLSearchParams({ classOrCourse, ...(board ? { board } : {}) }).toString();
    return this.request(`/academic/academic-subjects?${query}`);
  }
}

export const api = new ApiService();
export default api;
