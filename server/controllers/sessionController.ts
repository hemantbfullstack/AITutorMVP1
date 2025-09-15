import Session from '../models/Session.js';

// Create session
const createSession = async (req: any, res: any) => {
  try {
    const { sid, sess, expire } = req.body;

    const session = new Session({
      sid,
      sess,
      expire: new Date(expire)
    });

    await session.save();

    res.status(201).json({
      message: 'Session created successfully',
      session
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

// Get session by ID
const getSession = async (req: any, res: any) => {
  try {
    const { sid } = req.params;
    const session = await Session.findOne({ sid });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
};

// Update session
const updateSession = async (req: any, res: any) => {
  try {
    const { sid } = req.params;
    const { sess, expire } = req.body;

    const session = await Session.findOneAndUpdate(
      { sid },
      {
        sess,
        expire: expire ? new Date(expire) : undefined
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      message: 'Session updated successfully',
      session
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
};

// Delete session
const deleteSession = async (req: any, res: any) => {
  try {
    const { sid } = req.params;

    const session = await Session.findOneAndDelete({ sid });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
};

// Get all sessions (admin only)
const getAllSessions = async (req: any, res: any) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sessions = await Session.find()
      .sort({ expire: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Session.countDocuments();

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
    console.error('Get all sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
};

// Clean expired sessions
const cleanExpiredSessions = async (req: any, res: any) => {
  try {
    const now = new Date();
    const result = await Session.deleteMany({ expire: { $lt: now } });

    res.json({
      message: 'Expired sessions cleaned successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Clean expired sessions error:', error);
    res.status(500).json({ error: 'Failed to clean expired sessions' });
  }
};

// Get session statistics
const getSessionStats = async (req: any, res: any) => {
  try {
    const totalSessions = await Session.countDocuments();
    const activeSessions = await Session.countDocuments({ expire: { $gt: new Date() } });
    const expiredSessions = await Session.countDocuments({ expire: { $lte: new Date() } });

    res.json({
      totalSessions,
      activeSessions,
      expiredSessions
    });
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({ error: 'Failed to get session statistics' });
  }
};

export {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  getAllSessions,
  cleanExpiredSessions,
  getSessionStats
};
