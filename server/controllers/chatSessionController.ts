import ChatSession from '../models/ChatSession.js';
import EducationalCriteria from '../models/KnowledgeBase.js';

// Create new chat session
const createChatSession = async (req: any, res: any) => {
  try {
    const { sessionId, knowledgeBaseId } = req.body;

    // Verify knowledge base exists
    const knowledgeBase = await EducationalCriteria.findById(knowledgeBaseId);
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    const chatSession = new ChatSession({
      sessionId,
      knowledgeBaseId
    });

    await chatSession.save();

    res.status(201).json({
      message: 'Chat session created successfully',
      chatSession
    });
  } catch (error) {
    console.error('Create chat session error:', error);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
};

// Get chat session by session ID
const getChatSession = async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;

    const chatSession = await ChatSession.findOne({ sessionId })
      .populate('knowledgeBaseId', 'name description');

    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json(chatSession);
  } catch (error) {
    console.error('Get chat session error:', error);
    res.status(500).json({ error: 'Failed to get chat session' });
  }
};

// Get all chat sessions
const getChatSessions = async (req: any, res: any) => {
  try {
    const { page = 1, limit = 10, knowledgeBaseId } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};

    if (knowledgeBaseId) {
      query.knowledgeBaseId = knowledgeBaseId;
    }

    const chatSessions = await ChatSession.find(query)
      .populate('knowledgeBaseId', 'name description')
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await ChatSession.countDocuments(query);

    res.json({
      chatSessions,
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
    console.error('Get chat sessions error:', error);
    res.status(500).json({ error: 'Failed to get chat sessions' });
  }
};

// Add message to chat session
const addMessageToChatSession = async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const { role, content, isVoice = false, metadata } = req.body;

    const chatSession = await ChatSession.findOne({ sessionId });
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const message = {
      role,
      content,
      timestamp: new Date(),
      isVoice,
      metadata
    };

    chatSession.messages.push(message);
    chatSession.lastActivity = new Date();

    // Update total tokens if provided in metadata
    if (metadata && metadata.tokensUsed) {
      chatSession.totalTokensUsed += metadata.tokensUsed;
    }

    await chatSession.save();

    res.json({
      message: 'Message added to chat session successfully',
      chatSession
    });
  } catch (error) {
    console.error('Add message to chat session error:', error);
    res.status(500).json({ error: 'Failed to add message to chat session' });
  }
};

// Get messages from chat session
const getChatSessionMessages = async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const chatSession = await ChatSession.findOne({ sessionId });
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    const messages = chatSession.messages
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(offsetNum, offsetNum + limitNum);

    res.json({
      messages,
      totalMessages: chatSession.messages.length,
      totalTokensUsed: chatSession.totalTokensUsed
    });
  } catch (error) {
    console.error('Get chat session messages error:', error);
    res.status(500).json({ error: 'Failed to get chat session messages' });
  }
};

// Update chat session
const updateChatSession = async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const { knowledgeBaseId, totalTokensUsed } = req.body;

    const chatSession = await ChatSession.findOne({ sessionId });
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Verify knowledge base exists if provided
    if (knowledgeBaseId) {
      const knowledgeBase = await EducationalCriteria.findById(knowledgeBaseId);
      if (!knowledgeBase) {
        return res.status(404).json({ error: 'Knowledge base not found' });
      }
      chatSession.knowledgeBaseId = knowledgeBaseId;
    }

    if (totalTokensUsed !== undefined) {
      chatSession.totalTokensUsed = totalTokensUsed;
    }

    chatSession.lastActivity = new Date();
    await chatSession.save();

    res.json({
      message: 'Chat session updated successfully',
      chatSession
    });
  } catch (error) {
    console.error('Update chat session error:', error);
    res.status(500).json({ error: 'Failed to update chat session' });
  }
};

// Delete chat session
const deleteChatSession = async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;

    const chatSession = await ChatSession.findOneAndDelete({ sessionId });
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({ message: 'Chat session deleted successfully' });
  } catch (error) {
    console.error('Delete chat session error:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
};

// Clear messages from chat session
const clearChatSessionMessages = async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;

    const chatSession = await ChatSession.findOne({ sessionId });
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    chatSession.messages = [];
    chatSession.totalTokensUsed = 0;
    chatSession.lastActivity = new Date();

    await chatSession.save();

    res.json({
      message: 'Chat session messages cleared successfully',
      chatSession
    });
  } catch (error) {
    console.error('Clear chat session messages error:', error);
    res.status(500).json({ error: 'Failed to clear chat session messages' });
  }
};

// Get chat session statistics
const getChatSessionStats = async (req: any, res: any) => {
  try {
    const totalSessions = await ChatSession.countDocuments();

    const aggregatedStats = await ChatSession.aggregate([
      {
        $group: {
          _id: null,
          totalMessages: { $sum: { $size: '$messages' } },
          totalTokensUsed: { $sum: '$totalTokensUsed' },
          averageMessagesPerSession: { $avg: { $size: '$messages' } },
          averageTokensPerSession: { $avg: '$totalTokensUsed' }
        }
      }
    ]);

    const recentSessions = await ChatSession.find()
      .populate('knowledgeBaseId', 'name description')
      .sort({ lastActivity: -1 })
      .limit(5)
      .select('sessionId knowledgeBaseId totalTokensUsed lastActivity messages');

    const knowledgeBaseUsage = await ChatSession.aggregate([
      {
        $group: {
          _id: '$knowledgeBaseId',
          sessionCount: { $sum: 1 },
          totalMessages: { $sum: { $size: '$messages' } },
          totalTokens: { $sum: '$totalTokensUsed' }
        }
      },
      {
        $lookup: {
          from: 'knowledgebases',
          localField: '_id',
          foreignField: '_id',
          as: 'knowledgeBase'
        }
      },
      { $unwind: '$knowledgeBase' },
      { $sort: { sessionCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      overview: {
        totalSessions,
        ...aggregatedStats[0]
      },
      recentSessions,
      knowledgeBaseUsage
    });
  } catch (error) {
    console.error('Get chat session stats error:', error);
    res.status(500).json({ error: 'Failed to get chat session statistics' });
  }
};

export {
  createChatSession,
  getChatSession,
  getChatSessions,
  addMessageToChatSession,
  getChatSessionMessages,
  updateChatSession,
  deleteChatSession,
  clearChatSessionMessages,
  getChatSessionStats
};
