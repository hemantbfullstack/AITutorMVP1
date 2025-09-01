import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const chatApi = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export const chatService = {
  async sendMessage(sessionId: string, message: string): Promise<ChatMessage> {
    const response = await chatApi.post(`/chat/${sessionId}/messages`, { message });
    return response.data;
  },

  async getChatSessions(): Promise<ChatSession[]> {
    const response = await chatApi.get('/chat/sessions');
    return response.data;
  },

  async createChatSession(title?: string): Promise<ChatSession> {
    const response = await chatApi.post('/chat/sessions', { title });
    return response.data;
  },

  async deleteChatSession(sessionId: string): Promise<void> {
    await chatApi.delete(`/chat/sessions/${sessionId}`);
  }
};
