import apiClient from "@/utils/apiClient";
import { TokenManager } from "@/utils/tokenManager";

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
  role: "user" | "admin" | "student";
  profileImageUrl?: string;
  planId?: string;
  usageCount?: number;
}

export const authService = {
  async login(data: LoginData): Promise<User> {
    try {
      console.log("Attempting login to:", apiClient.defaults.baseURL + "/auth/login");
      console.log("Login data:", { email: data.email, password: "[REDACTED]" });
      
      const res = await apiClient.post("/auth/login", data);
      console.log("Login response:", res);
      
      const { user, token } = res.data;
      // Store JWT token
      if (token) {
        TokenManager.setToken(token);
        console.log("Token stored successfully");
      } else {
        console.error("No token received from server");
      }

      return user;
    } catch (error) {
      console.error("Login error:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      throw error;
    }
  },

  async signup(data: SignupData): Promise<User> {
    const res = await apiClient.post("/auth/register", data);
    const { user, token } = res.data;

    // Store JWT token
    if (token) {
      TokenManager.setToken(token);
    }

    return user;
  },

  async logout(): Promise<void> {
    // Remove token from localStorage
    TokenManager.removeToken();
  },

  async getCurrentUser(): Promise<User> {
    // With JWT, we can decode the token to get user info
    const token = TokenManager.getToken();
    console.log("Getting current user, token:", token ? "exists" : "missing");

    if (!token) {
      throw new Error("No token found");
    }

    if (TokenManager.isTokenExpired(token)) {
      // Remove expired token
      TokenManager.removeToken();
      throw new Error("Token expired");
    }

    const payload = TokenManager.getTokenPayload(token);
    console.log("Token payload:", payload);

    if (!payload) {
      throw new Error("Invalid token");
    }

    return {
      id: payload.userId,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      profileImageUrl: payload.profileImageUrl,
      planId: payload.planId,
      usageCount: payload.usageCount,
    };
  },
};
