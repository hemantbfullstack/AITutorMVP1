import Message from '../models/Message.js';
import TutorSession from '../models/TutorSession.js';

// Create new message
const createMessage = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { sessionId, role, content, image } = req.body;

    // Verify session exists and user has access
    const session = await TutorSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = new Message({
      sessionId,
      userId,
      role,
      content,
      image
    });

    await message.save();

    res.status(201).json({
      message: 'Message created successfully',
      message: message
    });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
};

// Get messages by session ID
const getMessagesBySession = async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { limit = 50, page = 1 } = req.query;

    // Verify session exists and user has access
    const session = await TutorSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const messages = await Message.find({ sessionId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Message.countDocuments({ sessionId });

    res.json({
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
    console.error('Get messages by session error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

// Get latest messages by session ID
const getLatestMessages = async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Verify session exists and user has access
    const session = await TutorSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const limitNum = parseInt(limit);
    const messages = await Message.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(limitNum);

    res.json(messages.reverse()); // Reverse to get chronological order
  } catch (error) {
    console.error('Get latest messages error:', error);
    res.status(500).json({ error: 'Failed to get latest messages' });
  }
};

// Get message by ID
const getMessage = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify session exists and user has access
    const session = await TutorSession.findById(message.sessionId);
    if (!session || session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(message);
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Failed to get message' });
  }
};

// Update message
const updateMessage = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content, image } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify session exists and user has access
    const session = await TutorSession.findById(message.sessionId);
    if (!session || session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow updating user messages
    if (message.role !== 'user') {
      return res.status(403).json({ error: 'Can only update user messages' });
    }

    // Update fields
    if (content !== undefined) message.content = content;
    if (image !== undefined) message.image = image;

    await message.save();

    res.json({
      message: 'Message updated successfully',
      message: message
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
};

// Delete message
const deleteMessage = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify session exists and user has access
    const session = await TutorSession.findById(message.sessionId);
    if (!session || session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow deleting user messages
    if (message.role !== 'user') {
      return res.status(403).json({ error: 'Can only delete user messages' });
    }

    await Message.findByIdAndDelete(id);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// Get all messages (admin only)
const getAllMessages = async (req: any, res: any) => {
  try {
    const { page = 1, limit = 10, sessionId, userId, role } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};
    
    if (sessionId) {
      query.sessionId = sessionId;
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    if (role) {
      query.role = role;
    }

    const messages = await Message.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('sessionId', 'title ibSubject ibLevel')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Message.countDocuments(query);

    res.json({
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
    console.error('Get all messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

// Get message statistics
const getMessageStats = async (req: any, res: any) => {
  try {
    const totalMessages = await Message.countDocuments();
    const userMessages = await Message.countDocuments({ role: 'user' });
    const assistantMessages = await Message.countDocuments({ role: 'assistant' });
    const systemMessages = await Message.countDocuments({ role: 'system' });

    const roleDistribution = await Message.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const recentMessages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'firstName lastName email')
      .populate('sessionId', 'title ibSubject ibLevel');

    res.json({
      overview: {
        totalMessages,
        userMessages,
        assistantMessages,
        systemMessages
      },
      roleDistribution,
      recentMessages
    });
  } catch (error) {
    console.error('Get message stats error:', error);
    res.status(500).json({ error: 'Failed to get message statistics' });
  }
};

export {
  createMessage,
  getMessagesBySession,
  getLatestMessages,
  getMessage,
  updateMessage,
  deleteMessage,
  getAllMessages,
  getMessageStats
};
