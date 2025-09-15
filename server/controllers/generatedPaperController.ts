
import GeneratedPaper from '../models/GeneratedPaper.js';

// Create new generated paper
const createGeneratedPaper = async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { subject, level, paperType, topics, questionsJson, markschemeJson, totalMarks } = req.body;

    const paper = new GeneratedPaper({
      userId,
      subject,
      level,
      paperType,
      topics,
      questionsJson,
      markschemeJson,
      totalMarks
    });

    await paper.save();

    res.status(201).json({
      message: 'Generated paper created successfully',
      paper
    });
  } catch (error) {
    console.error('Create generated paper error:', error);
    res.status(500).json({ error: 'Failed to create generated paper' });
  }
};

// Get generated paper by ID
const getGeneratedPaper = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const paper = await GeneratedPaper.findById(id);
    if (!paper) {
      return res.status(404).json({ error: 'Generated paper not found' });
    }

    // Check if user owns this paper
    if (paper.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(paper);
  } catch (error) {
    console.error('Get generated paper error:', error);
    res.status(500).json({ error: 'Failed to get generated paper' });
  }
};

// Get all generated papers for a user
const getUserGeneratedPapers = async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, subject, level, paperType } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = { userId };
    
    if (subject) {
      query.subject = subject;
    }
    
    if (level) {
      query.level = level;
    }
    
    if (paperType) {
      query.paperType = paperType;
    }

    const papers = await GeneratedPaper.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await GeneratedPaper.countDocuments(query);

    res.json({
      papers,
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
    console.error('Get user generated papers error:', error);
    res.status(500).json({ error: 'Failed to get generated papers' });
  }
};

// Update generated paper
const updateGeneratedPaper = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { topics, questionsJson, markschemeJson, totalMarks, pdfUrl, msPdfUrl } = req.body;

    const paper = await GeneratedPaper.findById(id);
    if (!paper) {
      return res.status(404).json({ error: 'Generated paper not found' });
    }

    // Check if user owns this paper
    if (paper.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update fields
    if (topics !== undefined) paper.topics = topics;
    if (questionsJson !== undefined) paper.questionsJson = questionsJson;
    if (markschemeJson !== undefined) paper.markschemeJson = markschemeJson;
    if (totalMarks !== undefined) paper.totalMarks = totalMarks;
    if (pdfUrl !== undefined) paper.pdfUrl = pdfUrl;
    if (msPdfUrl !== undefined) paper.msPdfUrl = msPdfUrl;

    await paper.save();

    res.json({
      message: 'Generated paper updated successfully',
      paper
    });
  } catch (error) {
    console.error('Update generated paper error:', error);
    res.status(500).json({ error: 'Failed to update generated paper' });
  }
};

// Delete generated paper
const deleteGeneratedPaper = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const paper = await GeneratedPaper.findById(id);
    if (!paper) {
      return res.status(404).json({ error: 'Generated paper not found' });
    }

    // Check if user owns this paper
    if (paper.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await GeneratedPaper.findByIdAndDelete(id);

    res.json({ message: 'Generated paper deleted successfully' });
  } catch (error) {
    console.error('Delete generated paper error:', error);
    res.status(500).json({ error: 'Failed to delete generated paper' });
  }
};

// Get all generated papers (admin only)
const getAllGeneratedPapers = async (req: any, res: any) => {
  try {
    const { page = 1, limit = 10, userId, subject, level, paperType } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (subject) {
      query.subject = subject;
    }
    
    if (level) {
      query.level = level;
    }
    
    if (paperType) {
      query.paperType = paperType;
    }

    const papers = await GeneratedPaper.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await GeneratedPaper.countDocuments(query);

    res.json({
      papers,
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
    console.error('Get all generated papers error:', error);
    res.status(500).json({ error: 'Failed to get generated papers' });
  }
};

// Get generated paper statistics
const getGeneratedPaperStats = async (req: any, res: any) => {
  try {
    const totalPapers = await GeneratedPaper.countDocuments();

    const subjectDistribution = await GeneratedPaper.aggregate([
      { $group: { _id: '$subject', count: { $sum: 1 } } }
    ]);

    const levelDistribution = await GeneratedPaper.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } }
    ]);

    const paperTypeDistribution = await GeneratedPaper.aggregate([
      { $group: { _id: '$paperType', count: { $sum: 1 } } }
    ]);

    const recentPapers = await GeneratedPaper.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'firstName lastName email');

    res.json({
      overview: {
        totalPapers
      },
      subjectDistribution,
      levelDistribution,
      paperTypeDistribution,
      recentPapers
    });
  } catch (error) {
    console.error('Get generated paper stats error:', error);
    res.status(500).json({ error: 'Failed to get generated paper statistics' });
  }
};

export {
  createGeneratedPaper,
  getGeneratedPaper,
  getUserGeneratedPapers,
  updateGeneratedPaper,
  deleteGeneratedPaper,
  getAllGeneratedPapers,
  getGeneratedPaperStats
};
