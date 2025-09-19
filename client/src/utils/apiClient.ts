import axios from 'axios';
import { TokenManager } from './tokenManager';

// API base URL for local development and production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    console.log('API Request:', config.url, 'Token available:', !!token);
    if (token && !TokenManager.isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Authorization header added');
    } else {
      console.log('No valid token available');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, 'Status:', response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', error.config?.url, 'Status:', error.response?.status, 'Message:', error.message);
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
