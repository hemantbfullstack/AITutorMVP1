import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const userApi = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  profileImageUrl?: string;
  subscription?: {
    plan: string;
    status: string;
    expiresAt: string;
  };
}

export const userService = {
  async getUserProfile(): Promise<UserProfile> {
    const response = await userApi.get('/user/profile');
    return response.data;
  },

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await userApi.put('/user/profile', data);
    return response.data;
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const response = await userApi.get('/admin/users');
    return response.data;
  },

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<UserProfile> {
    const response = await userApi.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  }
};
