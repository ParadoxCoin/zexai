import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '@/types/api';
import { supabase } from '@/lib/supabase';

// Helper to get the freshest available token
async function getFreshToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      // Keep auth_token in sync for legacy components
      localStorage.setItem('auth_token', data.session.access_token);
      return data.session.access_token;
    }
  } catch (e) {
    console.warn('Failed to get Supabase session:', e);
  }
  // Fallback: try localStorage keys
  return localStorage.getItem('auth_token') || null;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api/v1',
      timeout: 120000, // Increased to 120 seconds for AI tasks
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.setupAuthSync();
  }

  // Listen for Supabase auth changes and keep auth_token in sync
  private setupAuthSync() {
    try {
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.access_token) {
          localStorage.setItem('auth_token', session.access_token);
        } else {
          localStorage.removeItem('auth_token');
        }
      });
    } catch (e) {
      console.warn('Failed to setup auth sync:', e);
    }
  }

  private setupInterceptors() {
    // Request interceptor - add auth token (async to fetch fresh token)
    this.api.interceptors.request.use(
      async (config) => {
        const token = await getFreshToken();
        if (token && token !== 'null' && token !== 'undefined') {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Try refreshing the session before logging out
          try {
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            if (data?.session && !refreshError) {
              localStorage.setItem('auth_token', data.session.access_token);
              // Retry the original request with new token
              const originalRequest = error.config;
              originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
              return this.api(originalRequest);
            }
          } catch (refreshErr) {
            console.warn('Token refresh failed:', refreshErr);
          }
          // If refresh failed, redirect to login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, params?: any, config?: import('axios').AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.get(url, { params, ...config });
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: import('axios').AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: import('axios').AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.put(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: import('axios').AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.delete(url, config);
    return response.data;
  }

  async upload<T = any>(url: string, formData: FormData): Promise<ApiResponse<T>> {
    const response = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000,  // 5 minutes for large video uploads
    });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;