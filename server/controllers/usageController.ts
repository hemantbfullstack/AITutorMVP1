import Usage from '../models/Usage.js';

// Create new usage record
const createUsage = async (req: any, res: any) => {
  try {
    const { 
      tokensUsed = 0, 
      ttsMinutes = 0, 
      sttRequests = 0, 
      wolframRequests = 0, 
      embeddingRequests = 0, 
      totalCost = 0 
    } = req.body;

    const usage = new Usage({
      tokensUsed,
      ttsMinutes,
      sttRequests,
      wolframRequests,
      embeddingRequests,
      totalCost
    });

    await usage.save();

    res.status(201).json({
      message: 'Usage record created successfully',
      usage
    });
  } catch (error) {
    console.error('Create usage error:', error);
    res.status(500).json({ error: 'Failed to create usage record' });
  }
};

// Get all usage records
const getUsageRecords = async (req: any, res: any) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const usageRecords = await Usage.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Usage.countDocuments(query);

    res.json({
      usageRecords,
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
    console.error('Get usage records error:', error);
    res.status(500).json({ error: 'Failed to get usage records' });
  }
};

// Get usage record by ID
const getUsageRecord = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const usage = await Usage.findById(id);

    if (!usage) {
      return res.status(404).json({ error: 'Usage record not found' });
    }

    res.json(usage);
  } catch (error) {
    console.error('Get usage record error:', error);
    res.status(500).json({ error: 'Failed to get usage record' });
  }
};

// Update usage record
const updateUsageRecord = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { 
      tokensUsed, 
      ttsMinutes, 
      sttRequests, 
      wolframRequests, 
      embeddingRequests, 
      totalCost 
    } = req.body;

    const usage = await Usage.findById(id);
    if (!usage) {
      return res.status(404).json({ error: 'Usage record not found' });
    }

    // Update fields
    if (tokensUsed !== undefined) usage.tokensUsed = tokensUsed;
    if (ttsMinutes !== undefined) usage.ttsMinutes = ttsMinutes;
    if (sttRequests !== undefined) usage.sttRequests = sttRequests;
    if (wolframRequests !== undefined) usage.wolframRequests = wolframRequests;
    if (embeddingRequests !== undefined) usage.embeddingRequests = embeddingRequests;
    if (totalCost !== undefined) usage.totalCost = totalCost;

    await usage.save();

    res.json({
      message: 'Usage record updated successfully',
      usage
    });
  } catch (error) {
    console.error('Update usage record error:', error);
    res.status(500).json({ error: 'Failed to update usage record' });
  }
};

// Delete usage record
const deleteUsageRecord = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const usage = await Usage.findByIdAndDelete(id);
    if (!usage) {
      return res.status(404).json({ error: 'Usage record not found' });
    }

    res.json({ message: 'Usage record deleted successfully' });
  } catch (error) {
    console.error('Delete usage record error:', error);
    res.status(500).json({ error: 'Failed to delete usage record' });
  }
};

// Get usage statistics
const getUsageStats = async (req: any, res: any) => {
  try {
    const { startDate, endDate } = req.query;

    // Build query
    let query = {};
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const totalRecords = await Usage.countDocuments(query);

    const aggregatedStats = await Usage.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTokensUsed: { $sum: '$tokensUsed' },
          totalTtsMinutes: { $sum: '$ttsMinutes' },
          totalSttRequests: { $sum: '$sttRequests' },
          totalWolframRequests: { $sum: '$wolframRequests' },
          totalEmbeddingRequests: { $sum: '$embeddingRequests' },
          totalCost: { $sum: '$totalCost' },
          averageTokensPerDay: { $avg: '$tokensUsed' },
          averageCostPerDay: { $avg: '$totalCost' }
        }
      }
    ]);

    const dailyUsage = await Usage.find(query)
      .sort({ date: -1 })
      .limit(30)
      .select('date tokensUsed totalCost');

    const monthlyUsage = await Usage.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalTokensUsed: { $sum: '$tokensUsed' },
          totalCost: { $sum: '$totalCost' },
          recordCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      overview: {
        totalRecords,
        ...aggregatedStats[0]
      },
      dailyUsage,
      monthlyUsage
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
};

// Get usage by date range
const getUsageByDateRange = async (req: any, res: any) => {
  try {
    const { startDate, endDate } = req.params;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const usageRecords = await Usage.find({
      date: {
        $gte: start,
        $lte: end
      }
    }).sort({ date: 1 });

    const aggregatedStats = await Usage.aggregate([
      {
        $match: {
          date: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: null,
          totalTokensUsed: { $sum: '$tokensUsed' },
          totalTtsMinutes: { $sum: '$ttsMinutes' },
          totalSttRequests: { $sum: '$sttRequests' },
          totalWolframRequests: { $sum: '$wolframRequests' },
          totalEmbeddingRequests: { $sum: '$embeddingRequests' },
          totalCost: { $sum: '$totalCost' }
        }
      }
    ]);

    res.json({
      usageRecords,
      summary: aggregatedStats[0] || {
        totalTokensUsed: 0,
        totalTtsMinutes: 0,
        totalSttRequests: 0,
        totalWolframRequests: 0,
        totalEmbeddingRequests: 0,
        totalCost: 0
      }
    });
  } catch (error) {
    console.error('Get usage by date range error:', error);
    res.status(500).json({ error: 'Failed to get usage by date range' });
  }
};

export {
  createUsage,
  getUsageRecords,
  getUsageRecord,
  updateUsageRecord,
  deleteUsageRecord,
  getUsageStats,
  getUsageByDateRange
};
