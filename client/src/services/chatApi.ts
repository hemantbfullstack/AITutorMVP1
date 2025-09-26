import apiClient from '@/utils/apiClient';
import {
  ChatRoom,
  Message,
  CreateChatRoomRequest,
  CreateMessageRequest,
  UpdateChatRoomRequest,
  UpdateMessageRequest,
  SearchMessagesRequest,
  ChatRoomResponse,
  ChatRoomsResponse,
  MessageResponse,
  MessagesResponse,
  ChatRoomStats,
  MessageStats
} from '@/types/chat';

// ============================================================================
// CHAT ROOM API FUNCTIONS
// ============================================================================

export const chatRoomApi = {
  // Create new chat room
  create: async (data: CreateChatRoomRequest): Promise<ChatRoom> => {
    const response = await apiClient.post<ChatRoomResponse>('/chat-rooms/rooms', data);
    return response.data.room;
  },

  // Get user's chat rooms
  getRooms: async (params?: {
    type?: string;
    isActive?: boolean;
    limit?: number;
    page?: number;
  }): Promise<ChatRoomsResponse> => {
    const response = await apiClient.get<ChatRoomsResponse>('/chat-rooms/rooms', { params });
    return response.data;
  },

  // Get specific chat room
  getRoom: async (roomId: string): Promise<ChatRoom> => {
    const response = await apiClient.get<ChatRoomResponse>(`/chat-rooms/rooms/${roomId}`);
    return response.data.room;
  },

  // Update chat room
  updateRoom: async (roomId: string, data: UpdateChatRoomRequest): Promise<ChatRoom> => {
    const response = await apiClient.put<ChatRoomResponse>(`/chat-rooms/rooms/${roomId}`, data);
    return response.data.room;
  },

  // Delete chat room
  deleteRoom: async (roomId: string): Promise<void> => {
    await apiClient.delete(`/chat-rooms/rooms/${roomId}`);
  },

  // Archive chat room
  archiveRoom: async (roomId: string): Promise<ChatRoom> => {
    const response = await apiClient.patch<ChatRoomResponse>(`/chat-rooms/rooms/${roomId}/archive`);
    return response.data.room;
  },

  // Restore archived chat room
  restoreRoom: async (roomId: string): Promise<ChatRoom> => {
    const response = await apiClient.patch<ChatRoomResponse>(`/chat-rooms/rooms/${roomId}/restore`);
    return response.data.room;
  },

  // Get chat room statistics
  getStats: async (): Promise<ChatRoomStats> => {
    const response = await apiClient.get<{ success: boolean; stats: ChatRoomStats }>('/chat-rooms/rooms/stats');
    return response.data.stats;
  }
};

// ============================================================================
// MESSAGE API FUNCTIONS
// ============================================================================

export const messageApi = {
  // Create new message
  create: async (roomId: string, data: CreateMessageRequest): Promise<Message> => {
    const response = await apiClient.post<MessageResponse>(`/chat-rooms/rooms/${roomId}/messages`, data);
    return response.data.message;
  },

  // Get messages by room ID
  getMessagesByRoom: async (roomId: string, params?: {
    limit?: number;
    page?: number;
    before?: string;
    after?: string;
  }): Promise<MessagesResponse> => {
    const response = await apiClient.get<MessagesResponse>(`/chat-rooms/rooms/${roomId}/messages`, { params });
    return response.data;
  },

  // Get latest messages by room ID
  getLatestMessages: async (roomId: string, limit?: number): Promise<Message[]> => {
    const response = await apiClient.get<{ success: boolean; messages: Message[] }>(
      `/chat-rooms/rooms/${roomId}/messages/latest`,
      { params: { limit } }
    );
    return response.data.messages;
  },

  // Get specific message
  getMessage: async (messageId: string): Promise<Message> => {
    const response = await apiClient.get<MessageResponse>(`/chat-rooms/messages/${messageId}`);
    return response.data.message;
  },

  // Update message
  updateMessage: async (messageId: string, data: UpdateMessageRequest): Promise<Message> => {
    const response = await apiClient.put<MessageResponse>(`/chat-rooms/messages/${messageId}`, data);
    return response.data.message;
  },

  // Delete message
  deleteMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/chat-rooms/messages/${messageId}`);
  },

  // Add reaction to message
  addReaction: async (messageId: string, emoji: string): Promise<Message> => {
    const response = await apiClient.post<MessageResponse>(`/chat-rooms/messages/${messageId}/reactions`, { emoji });
    return response.data.message;
  },

  // Remove reaction from message
  removeReaction: async (messageId: string): Promise<Message> => {
    const response = await apiClient.delete<MessageResponse>(`/chat-rooms/messages/${messageId}/reactions`);
    return response.data.message;
  },

  // Search messages
  searchMessages: async (params: SearchMessagesRequest): Promise<MessagesResponse> => {
    const response = await apiClient.get<MessagesResponse>('/chat-rooms/messages/search', { params });
    return response.data;
  },

  // Get message statistics
  getStats: async (roomId?: string, days?: number): Promise<MessageStats> => {
    const response = await apiClient.get<{ success: boolean; stats: MessageStats }>('/chat-rooms/messages/stats', {
      params: { roomId, days }
    });
    return response.data.stats;
  }
};

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const chatApi = {
  // Create educational criteria chat room
  createEducationalCriteriaRoom: async (criteriaId: string, title: string): Promise<ChatRoom> => {
    return chatRoomApi.create({
      title,
      type: 'educational-criteria',
      criteriaId
    });
  },


  // Create general chat room
  createGeneralRoom: async (title: string): Promise<ChatRoom> => {
    return chatRoomApi.create({
      title,
      type: 'general'
    });
  },

  // Update chat room
  updateChatRoom: async (roomId: string, data: UpdateChatRoomRequest): Promise<ChatRoom> => {
    return chatRoomApi.updateRoom(roomId, data);
  },

  // Send text message
  sendTextMessage: async (roomId: string, content: string, role: 'user' | 'assistant' | 'system' = 'user'): Promise<Message> => {
    return messageApi.create(roomId, {
      role,
      content
    });
  },

  // Send image message
  sendImageMessage: async (
    roomId: string, 
    content: string, 
    image: { data: string; contentType: string },
    role: 'user' | 'assistant' | 'system' = 'user'
  ): Promise<Message> => {
    return messageApi.create(roomId, {
      role,
      content,
      image
    });
  },

  // Send Wolfram message
  sendWolframMessage: async (
    roomId: string,
    content: string,
    wolframImage: string,
    wolframInterpretation?: string,
    role: 'user' | 'assistant' | 'system' = 'assistant'
  ): Promise<Message> => {
    return messageApi.create(roomId, {
      role,
      content,
      wolframImage,
      wolframInterpretation,
      wolframGenerated: true
    });
  },

  // Send message with TTS data
  sendMessageWithTTS: async (
    roomId: string,
    content: string,
    ttsData: {
      audioUrl: string;
      duration: number;
      voiceId: string;
    },
    role: 'user' | 'assistant' | 'system' = 'assistant'
  ): Promise<Message> => {
    return messageApi.create(roomId, {
      role,
      content,
      ttsData
    });
  }
};

export default chatApi;
