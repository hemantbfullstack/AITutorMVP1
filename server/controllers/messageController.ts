import Message from '../models/Message.js';
import ChatRoom from '../models/ChatRoom.js';

// Create new message
const createMessage = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    const { 
      role, 
      content, 
      image, 
      wolframImage, 
      wolframInterpretation, 
      wolframGenerated,
      metadata,
      ttsData 
    } = req.body;

    // Verify room exists and user has access
    const room = await ChatRoom.findOne({ roomId, userId });
    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    if (!room.isActive) {
      return res.status(400).json({ error: 'Cannot send messages to archived room' });
    }

    // Validate required fields
    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }

    // Validate content length
    if (content.length > room.settings.maxMessageLength) {
      return res.status(400).json({ 
        error: `Message too long. Maximum ${room.settings.maxMessageLength} characters allowed.` 
      });
    }

    const message = new Message({
      roomId,
      userId,
      role,
      content,
      image,
      wolframImage,
      wolframInterpretation,
      wolframGenerated: wolframGenerated || false,
      metadata,
      ttsData
    });

    await message.save();

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ 
      error: 'Failed to create message',
      details: error.message 
    });
  }
};

// Get messages by room ID
const getMessagesByRoom = async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { 
      limit = 50, 
      page = 1, 
      before, 
      after 
    } = req.query;

    // Verify room exists and user has access
    const room = await ChatRoom.findOne({ roomId, userId });
    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query: any = { roomId };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    if (after) {
      query.createdAt = { $gt: new Date(after) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Message.countDocuments({ roomId });

    res.json({
      success: true,
      messages: messages.reverse(), // Reverse to get chronological order
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
    console.error('Get messages by room error:', error);
    res.status(500).json({ 
      error: 'Failed to get messages',
      details: error.message 
    });
  }
};

// Get latest messages by room ID
const getLatestMessages = async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Verify room exists and user has access
    const room = await ChatRoom.findOne({ roomId, userId });
    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const limitNum = parseInt(limit);
    const messages = await Message.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(limitNum);

    res.json({
      success: true,
      messages: messages.reverse() // Reverse to get chronological order
    });
  } catch (error) {
    console.error('Get latest messages error:', error);
    res.status(500).json({ 
      error: 'Failed to get latest messages',
      details: error.message 
    });
  }
};

// Get message by ID
const getMessage = async (req: any, res: any) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify room exists and user has access
    const room = await ChatRoom.findOne({ roomId: message.roomId, userId });
    if (!room) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ 
      error: 'Failed to get message',
      details: error.message 
    });
  }
};

// Update message
const updateMessage = async (req: any, res: any) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const { 
      content, 
      image, 
      metadata, 
      ttsData 
    } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify room exists and user has access
    const room = await ChatRoom.findOne({ roomId: message.roomId, userId });
    if (!room) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow updating user messages
    if (message.role !== 'user') {
      return res.status(403).json({ error: 'Can only update user messages' });
    }

    // Update fields
    if (content !== undefined) message.content = content;
    if (image !== undefined) message.image = image;
    if (metadata !== undefined) message.metadata = { ...message.metadata, ...metadata };
    if (ttsData !== undefined) message.ttsData = { ...message.ttsData, ...ttsData };

    await message.save();

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ 
      error: 'Failed to update message',
      details: error.message 
    });
  }
};

// Delete message
const deleteMessage = async (req: any, res: any) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify room exists and user has access
    const room = await ChatRoom.findOne({ roomId: message.roomId, userId });
    if (!room) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow deleting user messages
    if (message.role !== 'user') {
      return res.status(403).json({ error: 'Can only delete user messages' });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ 
      error: 'Failed to delete message',
      details: error.message 
    });
  }
};

// Add reaction to message
const addReaction = async (req: any, res: any) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify room exists and user has access
    const room = await ChatRoom.findOne({ roomId: message.roomId, userId });
    if (!room) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      (reaction: any) => reaction.userId !== userId
    );

    // Add new reaction
    message.reactions.push({
      userId,
      emoji,
      createdAt: new Date()
    });

    await message.save();

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ 
      error: 'Failed to add reaction',
      details: error.message 
    });
  }
};

// Remove reaction from message
const removeReaction = async (req: any, res: any) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify room exists and user has access
    const room = await ChatRoom.findOne({ roomId: message.roomId, userId });
    if (!room) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Remove user's reactions
    message.reactions = message.reactions.filter(
      (reaction: any) => reaction.userId !== userId
    );

    await message.save();

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ 
      error: 'Failed to remove reaction',
      details: error.message 
    });
  }
};

// Search messages
const searchMessages = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { 
      query, 
      roomId, 
      type, 
      limit = 20, 
      page = 1 
    } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    let searchQuery: any = {
      userId,
      $text: { $search: query }
    };

    if (roomId) {
      searchQuery.roomId = roomId;
    }

    if (type) {
      if (type === 'wolfram') {
        searchQuery.wolframImage = { $exists: true };
      } else if (type === 'image') {
        searchQuery.image = { $exists: true };
      } else if (type === 'text') {
        searchQuery.wolframImage = { $exists: false };
        searchQuery.image = { $exists: false };
      }
    }

    const messages = await Message.find(searchQuery)
      .populate('roomId', 'title type')
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Message.countDocuments(searchQuery);

    res.json({
      success: true,
      messages,
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
    console.error('Search messages error:', error);
    res.status(500).json({ 
      error: 'Failed to search messages',
      details: error.message 
    });
  }
};

// Get message statistics
const getMessageStats = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { roomId, days = 30 } = req.query;

    const daysNum = parseInt(days);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    let matchQuery: any = { userId, createdAt: { $gte: startDate } };
    if (roomId) {
      matchQuery.roomId = roomId;
    }

    const stats = await Message.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          avgTokens: { $avg: '$metadata.tokensUsed' },
          avgResponseTime: { $avg: '$metadata.responseTime' }
        }
      }
    ]);

    const totalMessages = await Message.countDocuments(matchQuery);
    const messagesWithImages = await Message.countDocuments({
      ...matchQuery,
      image: { $exists: true }
    });
    const messagesWithWolfram = await Message.countDocuments({
      ...matchQuery,
      wolframImage: { $exists: true }
    });

    res.json({
      success: true,
      stats: {
        totalMessages,
        messagesWithImages,
        messagesWithWolfram,
        byRole: stats,
        period: `${daysNum} days`
      }
    });
  } catch (error) {
    console.error('Get message stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get message statistics',
      details: error.message 
    });
  }
};

export {
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
};