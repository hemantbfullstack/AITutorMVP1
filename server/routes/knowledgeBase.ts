import express from 'express';
import EducationalCriteria from '../models/KnowledgeBase.js';
import { getIndex } from '../config/pinecone.js';

const router = express.Router();

// Get all knowledge bases
router.get('/', async (req: any, res: any) => {
  try {
    const knowledgeBases = await EducationalCriteria.find({})
      .select('name description educationalBoard subject level totalChunks totalTokens createdAt updatedAt files.originalName files.size files.uploadDate')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      criteria: knowledgeBases.map(kb => ({
        id: kb._id,
        name: kb.name,
        description: kb.description,
        educationalBoard: kb.educationalBoard,
        subject: kb.subject,
        level: kb.level,
        totalChunks: kb.totalChunks,
        totalTokens: kb.totalTokens,
        fileCount: kb.files.length,
        createdAt: kb.createdAt,
        updatedAt: kb.updatedAt,
        files: kb.files.map((file: any) => ({
          originalName: file.originalName,
          size: file.size,
          uploadDate: file.uploadDate
        }))
      }))
    });
  } catch (error: any) {
    console.error('Error fetching knowledge bases:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge bases' });
  }
});

// Get specific knowledge base
router.get('/:id', async (req: any, res: any) => {
  try {
    const knowledgeBase = await EducationalCriteria.findById(req.params.id);
    
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    res.json({
      success: true,
      knowledgeBase: {
        id: knowledgeBase._id,
        name: knowledgeBase.name,
        description: knowledgeBase.description,
        totalChunks: knowledgeBase.totalChunks,
        totalTokens: knowledgeBase.totalTokens,
        createdAt: knowledgeBase.createdAt,
        updatedAt: knowledgeBase.updatedAt,
        files: knowledgeBase.files.map((file: any) => ({
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          uploadDate: file.uploadDate,
          chunkCount: file.chunkCount
        }))
      }
    });
  } catch (error: any) {
    console.error('Error fetching knowledge base:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge base' });
  }
});

// Update knowledge base
router.put('/:id', async (req: any, res: any) => {
  try {
    const { name, description } = req.body;
    
    const knowledgeBase = await EducationalCriteria.findById(req.params.id);
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    if (name) knowledgeBase.name = name;
    if (description !== undefined) knowledgeBase.description = description;

    await knowledgeBase.save();

    res.json({
      success: true,
      knowledgeBase: {
        id: knowledgeBase._id,
        name: knowledgeBase.name,
        description: knowledgeBase.description,
        totalChunks: knowledgeBase.totalChunks,
        totalTokens: knowledgeBase.totalTokens,
        updatedAt: knowledgeBase.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Error updating knowledge base:', error);
    res.status(500).json({ error: 'Failed to update knowledge base' });
  }
});

// Delete knowledge base
router.delete('/:id', async (req: any, res: any) => {
  try {
    const knowledgeBase = await EducationalCriteria.findById(req.params.id);
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    // Delete from Pinecone (if available)
    try {
      const index = getIndex();
      const vectorsToDelete: string[] = [];
      
      for (const file of knowledgeBase.files) {
        for (let i = 0; i < file.chunkCount; i++) {
          vectorsToDelete.push(`${knowledgeBase._id}_${file.filename}_${i}`);
        }
      }

      if (vectorsToDelete.length > 0) {
        await index.deleteMany(vectorsToDelete);
      }
    } catch (error) {
      console.warn('⚠️ Failed to delete vectors from Pinecone:', error);
      // Continue with MongoDB deletion even if Pinecone fails
    }

    // Delete from MongoDB
    await EducationalCriteria.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Knowledge base deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting knowledge base:', error);
    res.status(500).json({ error: 'Failed to delete knowledge base' });
  }
});

// Delete specific file from knowledge base
router.delete('/:id/files/:filename', async (req: any, res: any) => {
  try {
    const { id, filename } = req.params;
    
    const knowledgeBase = await EducationalCriteria.findById(id);
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    const fileIndex = knowledgeBase.files.findIndex((file: any) => file.filename === filename);
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = knowledgeBase.files[fileIndex];
    
    // Delete from Pinecone (if available)
    try {
      const index = getIndex();
      const vectorsToDelete: string[] = [];
      
      for (let i = 0; i < file.chunkCount; i++) {
        vectorsToDelete.push(`${id}_${filename}_${i}`);
      }

      if (vectorsToDelete.length > 0) {
        await index.deleteMany(vectorsToDelete);
      }
    } catch (error) {
      console.warn('⚠️ Failed to delete file vectors from Pinecone:', error);
      // Continue with MongoDB deletion even if Pinecone fails
    }

    // Remove file from knowledge base
    knowledgeBase.files.splice(fileIndex, 1);
    knowledgeBase.totalChunks -= file.chunkCount;
    // Note: We can't calculate exact token count without the chunks, so we'll estimate
    // In a production system, you might want to store tokenCount per file
    knowledgeBase.totalTokens = Math.max(0, knowledgeBase.totalTokens - (file.chunkCount * 1000)); // Rough estimate

    await knowledgeBase.save();

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
