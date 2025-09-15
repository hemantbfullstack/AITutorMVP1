import apiClient from '@/utils/apiClient';

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
    const response = await apiClient.get('/user/profile');
    return response.data;
  },

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await apiClient.put('/user/profile', data);
    return response.data;
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<UserProfile> {
    const response = await apiClient.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  }
};
