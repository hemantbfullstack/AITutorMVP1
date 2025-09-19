import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createChatRoom,
  getChatRooms,
  getChatRoom,
  updateChatRoom,
  deleteChatRoom,
  archiveChatRoom,
  restoreChatRoom,
  getChatRoomStats
} from '../controllers/chatRoomController.js';
import {
  createMessage,
  getMessagesByRoom,
  getLatestMessages,
  getMessage,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  searchMessages,
  getMessageStats
} from '../controllers/messageController.js';
import { checkUsage } from 'server/checkUsageMiddleware.js';

const router = express.Router();

// ============================================================================
// CHAT ROOM ROUTES
// ============================================================================

// Create new chat room
router.post('/rooms', authenticateToken, createChatRoom);

// Get user's chat rooms
router.get('/rooms', authenticateToken, getChatRooms);

// Get specific chat room
router.get('/rooms/:roomId', authenticateToken, getChatRoom);

// Update chat room
router.put('/rooms/:roomId', authenticateToken, updateChatRoom);

// Delete chat room
router.delete('/rooms/:roomId', authenticateToken, deleteChatRoom);

// Archive chat room (soft delete)
router.patch('/rooms/:roomId/archive', authenticateToken, archiveChatRoom);

// Restore archived chat room
router.patch('/rooms/:roomId/restore', authenticateToken, restoreChatRoom);

// Get chat room statistics
router.get('/rooms/stats', authenticateToken, getChatRoomStats);

// ============================================================================
// MESSAGE ROUTES
// ============================================================================

// Create new message
router.post('/rooms/:roomId/messages', authenticateToken, checkUsage, createMessage);

// Get messages by room ID
router.get('/rooms/:roomId/messages', authenticateToken, getMessagesByRoom);

// Get latest messages by room ID
router.get('/rooms/:roomId/messages/latest', authenticateToken, getLatestMessages);

// Get specific message
router.get('/messages/:messageId', authenticateToken, getMessage);

// Update message
router.put('/messages/:messageId', authenticateToken, updateMessage);

// Delete message
router.delete('/messages/:messageId', authenticateToken, deleteMessage);

// Add reaction to message
router.post('/messages/:messageId/reactions', authenticateToken, addReaction);

// Remove reaction from message
router.delete('/messages/:messageId/reactions', authenticateToken, removeReaction);

// Search messages
router.get('/messages/search', authenticateToken, searchMessages);

// Get message statistics
router.get('/messages/stats', authenticateToken, getMessageStats);

export default router;
