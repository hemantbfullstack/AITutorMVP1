import TutorSession from '../models/TutorSession.js';
import Message from '../models/Message.js';

// Create new tutor session
const createTutorSession = async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { title, ibSubject, ibLevel } = req.body;

    const session = new TutorSession({
      userId,
      title,
      ibSubject,
      ibLevel
    });

    await session.save();

    res.status(201).json({
      message: 'Tutor session created successfully',
      session
    });
  } catch (error) {
    console.error('Create tutor session error:', error);
    res.status(500).json({ error: 'Failed to create tutor session' });
  }
};

// Get tutor session by ID
const getTutorSession = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const session = await TutorSession.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user owns this session
    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get messages for this session
    const messages = await Message.find({ sessionId: id })
      .sort({ createdAt: 1 });

    res.json({
      session,
      messages
    });
  } catch (error) {
    console.error('Get tutor session error:', error);
    res.status(500).json({ error: 'Failed to get tutor session' });
  }
};

// Get all tutor sessions for a user
const getUserTutorSessions = async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, ibSubject, ibLevel } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = { userId };
    
    if (ibSubject) {
      query.ibSubject = ibSubject;
    }
    
    if (ibLevel) {
      query.ibLevel = ibLevel;
    }

    const sessions = await TutorSession.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await TutorSession.countDocuments(query);

    res.json({
      sessions,
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
    console.error('Get user tutor sessions error:', error);
    res.status(500).json({ error: 'Failed to get tutor sessions' });
  }
};

// Update tutor session
const updateTutorSession = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, ibSubject, ibLevel, endedAt } = req.body;

    const session = await TutorSession.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user owns this session
    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update fields
    if (title !== undefined) session.title = title;
    if (ibSubject !== undefined) session.ibSubject = ibSubject;
    if (ibLevel !== undefined) session.ibLevel = ibLevel;
    if (endedAt !== undefined) session.endedAt = endedAt;

    await session.save();

    res.json({
      message: 'Tutor session updated successfully',
      session
    });
  } catch (error) {
    console.error('Update tutor session error:', error);
    res.status(500).json({ error: 'Failed to update tutor session' });
  }
};

// End tutor session
const endTutorSession = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const session = await TutorSession.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user owns this session
    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    session.endedAt = new Date();
    await session.save();

    res.json({
      message: 'Tutor session ended successfully',
      session
    });
  } catch (error) {
    console.error('End tutor session error:', error);
    res.status(500).json({ error: 'Failed to end tutor session' });
  }
};

// Delete tutor session
const deleteTutorSession = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const session = await TutorSession.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user owns this session
    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete associated messages first
    await Message.deleteMany({ sessionId: id });

    // Delete the session
    await TutorSession.findByIdAndDelete(id);

    res.json({ message: 'Tutor session deleted successfully' });
  } catch (error) {
    console.error('Delete tutor session error:', error);
    res.status(500).json({ error: 'Failed to delete tutor session' });
  }
};

// Get all tutor sessions (admin only)
const getAllTutorSessions = async (req: any, res: any) => {
  try {
    const { page = 1, limit = 10, userId, ibSubject, ibLevel } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (ibSubject) {
      query.ibSubject = ibSubject;
    }
    
    if (ibLevel) {
      query.ibLevel = ibLevel;
    }

    const sessions = await TutorSession.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await TutorSession.countDocuments(query);

    res.json({
      sessions,
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
    console.error('Get all tutor sessions error:', error);
    res.status(500).json({ error: 'Failed to get tutor sessions' });
  }
};

// Get tutor session statistics
const getTutorSessionStats = async (req: any, res: any) => {
  try {
    const totalSessions = await TutorSession.countDocuments();
    const activeSessions = await TutorSession.countDocuments({ endedAt: null });
    const completedSessions = await TutorSession.countDocuments({ endedAt: { $ne: null } });

    const subjectDistribution = await TutorSession.aggregate([
      { $group: { _id: '$ibSubject', count: { $sum: 1 } } }
    ]);

    const levelDistribution = await TutorSession.aggregate([
      { $group: { _id: '$ibLevel', count: { $sum: 1 } } }
    ]);

    const recentSessions = await TutorSession.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'firstName lastName email');

    res.json({
      overview: {
        totalSessions,
        activeSessions,
        completedSessions
      },
      subjectDistribution,
      levelDistribution,
      recentSessions
    });
  } catch (error) {
    console.error('Get tutor session stats error:', error);
    res.status(500).json({ error: 'Failed to get tutor session statistics' });
  }
};

export {
  createTutorSession,
  getTutorSession,
  getUserTutorSessions,
  updateTutorSession,
  endTutorSession,
  deleteTutorSession,
  getAllTutorSessions,
  getTutorSessionStats
};
