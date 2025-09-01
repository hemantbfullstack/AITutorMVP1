import axios from 'axios';

const authApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export interface LoginData {
  email: string;
  password: string;
}
export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'student';
  profileImageUrl?: string;
}

export const authService = {
  async login(data: LoginData): Promise<User> {
    const res = await authApi.post('/auth/login', data);
    return res.data.user;
  },

  async signup(data: SignupData): Promise<User> {
    const res = await authApi.post('/auth/signup', data);
    return res.data.user;
  },

  async logout(): Promise<void> {
    await authApi.post('/logout');
  },

  async getCurrentUser(): Promise<User> {
    const res = await authApi.get('/auth/user');
    return res.data;
  },
};
