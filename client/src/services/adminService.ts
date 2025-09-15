import { apiClient } from '@/utils/apiClient';

// Types - Updated to match actual server response
export interface UserSchema {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  isLocalUser: boolean;
  role: 'student' | 'teacher' | 'admin';
  planId: string;
  usageCount: number;
  imageUsageCount: number;
  voiceUsageCount: number;
  paperUsageCount: number;
  profileImageUrl?: string;
  usageResetAt?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface UserWithStats extends UserSchema {
  stats: {
    sessions: number;
    messages: number;
    papers: number;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface FilterOptions {
  roles: string[];
  plans: string[];
  statuses: string[];
}

export interface UsersResponse {
  users: UserWithStats[];
  pagination: PaginationInfo;
  filters?: FilterOptions;
}

export interface UpdateUserRoleRequest {
  role: string;
}

export interface UpdateUserPlanRequest {
  planId: string;
}

// Admin Service
export const adminService = {
  // Get all users with pagination and filters
  getUsers: async (params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    plan?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<UsersResponse> => {
    const searchParams = new URLSearchParams();
    
    searchParams.append('page', params.page.toString());
    searchParams.append('limit', params.limit.toString());
    
    if (params.search) searchParams.append('search', params.search);
    if (params.role && params.role !== 'all') searchParams.append('role', params.role);
    if (params.plan && params.plan !== 'all') searchParams.append('plan', params.plan);
    if (params.status && params.status !== 'all') searchParams.append('status', params.status);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await apiClient.get(`/admin/users?${searchParams.toString()}`);
    return response.data;
  },

  // Update user role
  updateUserRole: async (userId: string, data: UpdateUserRoleRequest): Promise<void> => {
    await apiClient.patch(`/admin/users/${userId}/role`, data);
  },

  // Update user plan
  updateUserPlan: async (userId: string, data: UpdateUserPlanRequest): Promise<void> => {
    await apiClient.patch(`/admin/users/${userId}/plan`, data);
  },

  // Reset user usage
  resetUserUsage: async (userId: string): Promise<void> => {
    await apiClient.patch(`/admin/users/${userId}/reset-usage`);
  },

  // Delete user
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  // Get user statistics
  getUserStats: async (): Promise<any> => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },

  // Get system statistics
  getSystemStats: async (): Promise<any> => {
    const response = await apiClient.get('/admin/system-stats');
    return response.data;
  }
};
