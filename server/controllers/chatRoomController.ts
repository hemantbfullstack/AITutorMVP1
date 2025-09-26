import ChatRoom from '../models/ChatRoom.js';
import Message from '../models/Message.js';
import { v4 as uuidv4 } from 'uuid';

// Create new chat room
const createChatRoom = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { 
      title, 
      type, 
      criteriaId, 
      ttsSettings 
    } = req.body;


    // Validate required fields based on type
    if (!title || !type) {
      return res.status(400).json({ 
        error: 'Title and type are required' 
      });
    }

    if (type === 'educational-criteria' && !criteriaId) {
      return res.status(400).json({ 
        error: 'criteriaId is required for educational-criteria type' 
      });
    }


    // Generate unique room ID
    const roomId = uuidv4();

    // Create chat room
    const chatRoom = new ChatRoom({
      roomId,
      userId,
      title: title.trim(),
      type,
      criteriaId: type === 'educational-criteria' ? criteriaId : undefined,
      ttsSettings: ttsSettings || {
        selectedVoiceId: 'alloy',
        autoPlayVoice: false,
        volume: 0.7
      }
    });

    await chatRoom.save();


    res.status(201).json({
      success: true,
      room: chatRoom
    });
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({ 
      error: 'Failed to create chat room',
      details: error.message 
    });
  }
};

// Get user's chat rooms
const getChatRooms = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { 
      type, 
      isActive = true, 
      limit = 50, 
      page = 1 
    } = req.query;


    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query: any = { userId };


    // Also check rooms for this specific user
    const userRooms = await ChatRoom.find({ userId });

    const rooms = await ChatRoom.find(query)
      .populate('criteriaId', 'name description educationalBoard subject level')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await ChatRoom.countDocuments(query);

    res.json({
      success: true,
      rooms,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({ 
      error: 'Failed to get chat rooms',
      details: error.message 
    });
  }
};

// Get specific chat room
const getChatRoom = async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ChatRoom.findOne({ roomId, userId })
      .populate('criteriaId', 'name description educationalBoard subject level');

    if (!room) {
      return res.status(404).json({ 
        error: 'Chat room not found' 
      });
    }

    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(500).json({ 
      error: 'Failed to get chat room',
      details: error.message 
    });
  }
};

// Update chat room
const updateChatRoom = async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { 
      title, 
      ttsSettings, 
      settings 
    } = req.body;

    const room = await ChatRoom.findOne({ roomId, userId });

    if (!room) {
      return res.status(404).json({ 
        error: 'Chat room not found' 
      });
    }

    // Update allowed fields
    if (title !== undefined) room.title = title.trim();
    if (ttsSettings !== undefined) room.ttsSettings = { ...room.ttsSettings, ...ttsSettings };
    if (settings !== undefined) room.settings = { ...room.settings, ...settings };

    await room.save();

    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Update chat room error:', error);
    res.status(500).json({ 
      error: 'Failed to update chat room',
      details: error.message 
    });
  }
};

// Delete chat room
const deleteChatRoom = async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ChatRoom.findOne({ roomId, userId });

    if (!room) {
      return res.status(404).json({ 
        error: 'Chat room not found' 
      });
    }

    // Delete all messages in this room
    await Message.deleteMany({ roomId });

    // Delete the room
    await ChatRoom.deleteOne({ roomId, userId });

    res.json({
      success: true,
      message: 'Chat room deleted successfully'
    });
  } catch (error) {
    console.error('Delete chat room error:', error);
    res.status(500).json({ 
      error: 'Failed to delete chat room',
      details: error.message 
    });
  }
};

// Archive chat room (soft delete)
const archiveChatRoom = async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ChatRoom.findOneAndUpdate(
      { roomId, userId },
      { isActive: false },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ 
        error: 'Chat room not found' 
      });
    }

    res.json({
      success: true,
      room,
      message: 'Chat room archived successfully'
    });
  } catch (error) {
    console.error('Archive chat room error:', error);
    res.status(500).json({ 
      error: 'Failed to archive chat room',
      details: error.message 
    });
  }
};

// Restore archived chat room
const restoreChatRoom = async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ChatRoom.findOneAndUpdate(
      { roomId, userId },
      { isActive: true },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ 
        error: 'Chat room not found' 
      });
    }

    res.json({
      success: true,
      room,
      message: 'Chat room restored successfully'
    });
  } catch (error) {
    console.error('Restore chat room error:', error);
    res.status(500).json({ 
      error: 'Failed to restore chat room',
      details: error.message 
    });
  }
};

// Get chat room statistics
const getChatRoomStats = async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const stats = await ChatRoom.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalMessages: { $sum: '$messageCount' },
          avgMessages: { $avg: '$messageCount' }
        }
      }
    ]);

    const totalRooms = await ChatRoom.countDocuments({ userId });
    const activeRooms = await ChatRoom.countDocuments({ userId, isActive: true });
    const totalMessages = await Message.countDocuments({ userId });

    res.json({
      success: true,
      stats: {
        totalRooms,
        activeRooms,
        archivedRooms: totalRooms - activeRooms,
        totalMessages,
        byType: stats
      }
    });
  } catch (error) {
    console.error('Get chat room stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get chat room statistics',
      details: error.message 
    });
  }
};

export {
  createChatRoom,
  getChatRooms,
  getChatRoom,
  updateChatRoom,
  deleteChatRoom,
  archiveChatRoom,
  restoreChatRoom,
  getChatRoomStats
};
