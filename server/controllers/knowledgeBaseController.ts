import EducationalCriteria from '../models/KnowledgeBase.js';

// Create new knowledge base
const createEducationalCriteria = async (req: any, res: any) => {
  try {
    const { name, description } = req.body;

    const knowledgeBase = new EducationalCriteria({
      name,
      description
    });

    await knowledgeBase.save();

    res.status(201).json({
      message: 'Knowledge base created successfully',
      knowledgeBase
    });
  } catch (error) {
    console.error('Create knowledge base error:', error);
    res.status(500).json({ error: 'Failed to create knowledge base' });
  }
};

// Get all knowledge bases
const getEducationalCriterias = async (req: any, res: any) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const knowledgeBases = await EducationalCriteria.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await EducationalCriteria.countDocuments(query);

    res.json({
      knowledgeBases,
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
    console.error('Get knowledge bases error:', error);
    res.status(500).json({ error: 'Failed to get knowledge bases' });
  }
};

// Get knowledge base by ID
const getEducationalCriteria = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const knowledgeBase = await EducationalCriteria.findById(id);

    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    res.json(knowledgeBase);
  } catch (error) {
    console.error('Get knowledge base error:', error);
    res.status(500).json({ error: 'Failed to get knowledge base' });
  }
};

// Update knowledge base
const updateEducationalCriteria = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const knowledgeBase = await EducationalCriteria.findByIdAndUpdate(
      id,
      { name, description },
      { new: true }
    );

    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    res.json({
      message: 'Knowledge base updated successfully',
      knowledgeBase
    });
  } catch (error) {
    console.error('Update knowledge base error:', error);
    res.status(500).json({ error: 'Failed to update knowledge base' });
  }
};

// Delete knowledge base
const deleteEducationalCriteria = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const knowledgeBase = await EducationalCriteria.findByIdAndDelete(id);
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    res.json({ message: 'Knowledge base deleted successfully' });
  } catch (error) {
    console.error('Delete knowledge base error:', error);
    res.status(500).json({ error: 'Failed to delete knowledge base' });
  }
};

// Add file to knowledge base
const addFileToEducationalCriteria = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { filename, originalName, size, chunks } = req.body;

    const knowledgeBase = await EducationalCriteria.findById(id);
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    const fileData = {
      filename,
      originalName,
      size,
      uploadDate: new Date(),
      chunks: chunks || []
    };

    knowledgeBase.files.push(fileData);
    knowledgeBase.totalChunks += chunks ? chunks.length : 0;
    knowledgeBase.totalTokens += chunks ? chunks.reduce((sum: number, chunk: any) => sum + (chunk.tokenCount || 0), 0) : 0;

    await knowledgeBase.save();

    res.json({
      message: 'File added to knowledge base successfully',
      knowledgeBase
    });
  } catch (error) {
    console.error('Add file to knowledge base error:', error);
    res.status(500).json({ error: 'Failed to add file to knowledge base' });
  }
};

// Remove file from knowledge base
const removeFileFromEducationalCriteria = async (req: any, res: any) => {
  try {
    const { id, fileId } = req.params;

    const knowledgeBase = await EducationalCriteria.findById(id);
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    const fileIndex = knowledgeBase.files.findIndex((file: any) => file._id.toString() === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found in knowledge base' });
    }

    const file = knowledgeBase.files[fileIndex];
    knowledgeBase.totalChunks -= file.chunks.length;
    knowledgeBase.totalTokens -= file.chunks.reduce((sum: number, chunk: any) => sum + (chunk.tokenCount || 0), 0);

    knowledgeBase.files.splice(fileIndex, 1);
    await knowledgeBase.save();

    res.json({
      message: 'File removed from knowledge base successfully',
      knowledgeBase
    });
  } catch (error) {
    console.error('Remove file from knowledge base error:', error);
    res.status(500).json({ error: 'Failed to remove file from knowledge base' });
  }
};

// Add chunks to file
const addChunksToFile = async (req: any, res: any) => {
  try {
    const { id, fileId } = req.params;
    const { chunks } = req.body;

    const knowledgeBase = await EducationalCriteria.findById(id);
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    const file = knowledgeBase.files.find((f: any) => f._id.toString() === fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found in knowledge base' });
    }

    file.chunks.push(...chunks);
    knowledgeBase.totalChunks += chunks.length;
    knowledgeBase.totalTokens += chunks.reduce((sum: number, chunk: any) => sum + (chunk.tokenCount || 0), 0);

    await knowledgeBase.save();

    res.json({
      message: 'Chunks added to file successfully',
      knowledgeBase
    });
  } catch (error) {
    console.error('Add chunks to file error:', error);
    res.status(500).json({ error: 'Failed to add chunks to file' });
  }
};

// Get knowledge base statistics
const getEducationalCriteriaStats = async (req: any, res: any) => {
  try {
    const totalEducationalCriterias = await EducationalCriteria.countDocuments();

    const aggregatedStats = await EducationalCriteria.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: { $size: '$files' } },
          totalChunks: { $sum: '$totalChunks' },
          totalTokens: { $sum: '$totalTokens' },
          averageFilesPerKB: { $avg: { $size: '$files' } },
          averageChunksPerKB: { $avg: '$totalChunks' }
        }
      }
    ]);

    const recentEducationalCriterias = await EducationalCriteria.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name description totalFiles totalChunks totalTokens updatedAt');

    res.json({
      overview: {
        totalEducationalCriterias,
        ...aggregatedStats[0]
      },
      recentEducationalCriterias
    });
  } catch (error) {
    console.error('Get knowledge base stats error:', error);
    res.status(500).json({ error: 'Failed to get knowledge base statistics' });
  }
};

export {
  createEducationalCriteria,
  getEducationalCriterias,
  getEducationalCriteria,
  updateEducationalCriteria,
  deleteEducationalCriteria,
  addFileToEducationalCriteria,
  removeFileFromEducationalCriteria,
  addChunksToFile,
  getEducationalCriteriaStats
};
