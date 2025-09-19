// Chat Room Types
export interface ChatRoom {
  _id: string;
  roomId: string;
  userId: string;
  title: string;
  type: 'educational-criteria' | 'ib-tutor' | 'general';
  criteriaId?: string;
  sessionId?: string;
  ibSubject?: 'AA' | 'AI';
  ibLevel?: 'HL' | 'SL';
  messageCount: number;
  lastMessageAt: string;
  isActive: boolean;
  ttsSettings: {
    selectedVoiceId: string;
    autoPlayVoice: boolean;
    volume: number;
  };
  settings: {
    allowImageUpload: boolean;
    enableWolframIntegration: boolean;
    maxMessageLength: number;
  };
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

// Message Types
export interface Message {
  _id: string;
  roomId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: {
    data: string;
    contentType: string;
  };
  wolframImage?: string;
  wolframInterpretation?: string;
  wolframGenerated?: boolean;
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
    model?: string;
    criteriaUsed?: boolean;
    knowledgeBase?: string;
  };
  ttsData?: {
    audioUrl: string;
    duration: number;
    voiceId: string;
    generatedAt: string;
  };
  status: 'sent' | 'delivered' | 'read' | 'failed';
  isStreaming: boolean;
  reactions: MessageReaction[];
  displayContent: string;
  messageType: 'text' | 'image' | 'wolfram';
  createdAt: string;
  updatedAt: string;
}

// Message Reaction Types
export interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: string;
}

// API Response Types
export interface ChatRoomResponse {
  success: boolean;
  room: ChatRoom;
}

export interface ChatRoomsResponse {
  success: boolean;
  rooms: ChatRoom[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface MessageResponse {
  success: boolean;
  message: Message;
}

export interface MessagesResponse {
  success: boolean;
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Chat Room Creation Types
export interface CreateChatRoomRequest {
  title: string;
  type: 'educational-criteria' | 'ib-tutor' | 'general';
  criteriaId?: string;
  ibSubject?: 'AA' | 'AI';
  ibLevel?: 'HL' | 'SL';
  ttsSettings?: {
    selectedVoiceId: string;
    autoPlayVoice: boolean;
    volume: number;
  };
}

// Message Creation Types
export interface CreateMessageRequest {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: {
    data: string;
    contentType: string;
  };
  wolframImage?: string;
  wolframInterpretation?: string;
  wolframGenerated?: boolean;
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
    model?: string;
    criteriaUsed?: boolean;
    knowledgeBase?: string;
  };
  ttsData?: {
    audioUrl: string;
    duration: number;
    voiceId: string;
  };
}

// Chat Room Update Types
export interface UpdateChatRoomRequest {
  title?: string;
  sessionId?: string;
  ttsSettings?: {
    selectedVoiceId?: string;
    autoPlayVoice?: boolean;
    volume?: number;
  };
  settings?: {
    allowImageUpload?: boolean;
    enableWolframIntegration?: boolean;
    maxMessageLength?: number;
  };
}

// Message Update Types
export interface UpdateMessageRequest {
  content?: string;
  image?: {
    data: string;
    contentType: string;
  };
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
    model?: string;
    criteriaUsed?: boolean;
    knowledgeBase?: string;
  };
  ttsData?: {
    audioUrl: string;
    duration: number;
    voiceId: string;
  };
}

// Search Types
export interface SearchMessagesRequest {
  query: string;
  roomId?: string;
  type?: 'text' | 'image' | 'wolfram';
  limit?: number;
  page?: number;
}

// Statistics Types
export interface ChatRoomStats {
  totalRooms: number;
  activeRooms: number;
  archivedRooms: number;
  totalMessages: number;
  byType: Array<{
    _id: string;
    count: number;
    totalMessages: number;
    avgMessages: number;
  }>;
}

export interface MessageStats {
  totalMessages: number;
  messagesWithImages: number;
  messagesWithWolfram: number;
  byRole: Array<{
    _id: string;
    count: number;
    avgTokens: number;
    avgResponseTime: number;
  }>;
  period: string;
}
