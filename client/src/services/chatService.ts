import apiClient from '@/utils/apiClient';

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
    const response = await apiClient.post(`/chat/${sessionId}/messages`, { message });
    return response.data;
  },

  async getChatSessions(): Promise<ChatSession[]> {
    const response = await apiClient.get('/chat/sessions');
    return response.data;
  },

  async createChatSession(title?: string): Promise<ChatSession> {
    const response = await apiClient.post('/chat/sessions', { title });
    return response.data;
  },

  async deleteChatSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/chat/sessions/${sessionId}`);
  }
};
