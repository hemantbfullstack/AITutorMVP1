import axios from 'axios';
import { TokenManager } from './tokenManager';

// In Replit, frontend and backend run on the same domain
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname.includes('replit') ? '' : 'http://localhost:5000');

// Create axios instance
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CORS with credentials
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = TokenManager.getToken();
    if (token && !TokenManager.isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear it
      TokenManager.removeToken();
      // Redirect to login or trigger logout
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
