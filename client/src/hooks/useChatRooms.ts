import { useState, useEffect, useCallback } from 'react';
import { chatRoomApi, messageApi } from '@/services/chatApi';
import { ChatRoom, Message, CreateChatRoomRequest } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';

export const useChatRooms = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load chat rooms
  const loadRooms = useCallback(async (params?: {
    type?: string;
    isActive?: boolean;
    limit?: number;
    page?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await chatRoomApi.getRooms(params);
      setRooms(response.rooms);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load chat rooms';
      console.error('Error loading chat rooms:', err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new chat room
  const createRoom = useCallback(async (data: CreateChatRoomRequest): Promise<ChatRoom | null> => {
    try {
      setLoading(true);
      setError(null);
      const newRoom = await chatRoomApi.create(data);
      setRooms(prev => [newRoom, ...prev]);
      toast({
        title: "Success",
        description: "Chat room created successfully",
      });
      return newRoom;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create chat room';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Update chat room
  const updateRoom = useCallback(async (roomId: string, data: any): Promise<ChatRoom | null> => {
    try {
      setLoading(true);
      setError(null);
      const updatedRoom = await chatRoomApi.updateRoom(roomId, data);
      setRooms(prev => prev.map(room => 
        room.roomId === roomId ? updatedRoom : room
      ));
      toast({
        title: "Success",
        description: "Chat room updated successfully",
      });
      return updatedRoom;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update chat room';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Delete chat room
  const deleteRoom = useCallback(async (roomId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await chatRoomApi.deleteRoom(roomId);
      setRooms(prev => prev.filter(room => room.roomId !== roomId));
      toast({
        title: "Success",
        description: "Chat room deleted successfully",
      });
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete chat room';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Archive chat room
  const archiveRoom = useCallback(async (roomId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const archivedRoom = await chatRoomApi.archiveRoom(roomId);
      setRooms(prev => prev.map(room => 
        room.roomId === roomId ? archivedRoom : room
      ));
      toast({
        title: "Success",
        description: "Chat room archived successfully",
      });
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to archive chat room';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Restore chat room
  const restoreRoom = useCallback(async (roomId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const restoredRoom = await chatRoomApi.restoreRoom(roomId);
      setRooms(prev => prev.map(room => 
        room.roomId === roomId ? restoredRoom : room
      ));
      toast({
        title: "Success",
        description: "Chat room restored successfully",
      });
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to restore chat room';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load rooms on mount
  useEffect(() => {
    const loadRoomsOnMount = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await chatRoomApi.getRooms();
        setRooms(response.rooms);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Failed to load chat rooms';
        console.error('Error loading chat rooms on mount:', err);
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadRoomsOnMount();
  }, []); // Empty dependency array to run only once on mount

  return {
    rooms,
    loading,
    error,
    loadRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    archiveRoom,
    restoreRoom
  };
};

export const useChatRoom = (roomId: string | null) => {
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load chat room details
  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    
    try {
      setLoading(true);
      setError(null);
      const roomData = await chatRoomApi.getRoom(roomId);
      setRoom(roomData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load chat room';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [roomId, toast]);

  // Load messages for the room
  const loadMessages = useCallback(async (params?: {
    limit?: number;
    page?: number;
    before?: string;
    after?: string;
  }) => {
    if (!roomId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await messageApi.getMessagesByRoom(roomId, params);
      setMessages(response.messages);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load messages';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [roomId, toast]);

  // Load latest messages
  const loadLatestMessages = useCallback(async (limit?: number) => {
    if (!roomId) return;
    
    try {
      setLoading(true);
      setError(null);
      const latestMessages = await messageApi.getLatestMessages(roomId, limit);
      setMessages(latestMessages);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load latest messages';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [roomId, toast]);

  // Add new message to the list
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Update message in the list
  const updateMessage = useCallback((messageId: string, updatedMessage: Message) => {
    setMessages(prev => prev.map(msg => 
      msg._id === messageId ? updatedMessage : msg
    ));
  }, []);

  // Remove message from the list
  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg._id !== messageId));
  }, []);

  // Load room and messages when roomId changes
  useEffect(() => {
    if (roomId) {
      loadRoom();
      loadLatestMessages();
    } else {
      setRoom(null);
      setMessages([]);
    }
  }, [roomId, loadRoom, loadLatestMessages]);

  return {
    room,
    messages,
    loading,
    error,
    loadRoom,
    loadMessages,
    loadLatestMessages,
    addMessage,
    updateMessage,
    removeMessage
  };
};

export default useChatRooms;
