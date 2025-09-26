const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const KnowledgeBase = require('../models/KnowledgeBase');
const { processFile, saveFile, deleteFile } = require('../utils/fileProcessor');
const { generateEmbedding } = require('../config/openai');
const { getIndex } = require('../config/pinecone');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 15 * 1024 * 1024, // 15MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.txt', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, and DOCX files are allowed'), false);
    }
  }
});

// Upload file and create/update knowledge base
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { knowledgeBaseName, knowledgeBaseId, description } = req.body;
    
    if (!knowledgeBaseName && !knowledgeBaseId) {
      return res.status(400).json({ error: 'Knowledge base name or ID is required' });
    }

    // Process the uploaded file
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const { filename, filePath, originalName, size } = await saveFile(req.file, uploadPath);
    
    let processedData;
    try {
      processedData = await processFile(filePath, originalName);
    } catch (error) {
      await deleteFile(filePath);
      throw error;
    }

    // Generate embeddings for each chunk
    const chunksWithEmbeddings = [];
    
    for (let i = 0; i < processedData.chunks.length; i++) {
      const chunk = processedData.chunks[i];
      
      // Validate chunk text
      if (!chunk || typeof chunk !== 'string' || chunk.trim().length === 0) {
        console.warn(`Skipping empty chunk ${i}`);
        continue;
      }
      
      // Ensure chunk is not too long (OpenAI has limits)
      let trimmedChunk = chunk.trim();
      if (trimmedChunk.length > 8000) { // OpenAI limit is around 8000 tokens
        console.warn(`Chunk ${i} too long, truncating`);
        trimmedChunk = trimmedChunk.substring(0, 8000);
      }
      
      try {
        const embedding = await generateEmbedding(trimmedChunk);
        
        chunksWithEmbeddings.push({
          text: trimmedChunk,
          embedding,
          tokenCount: trimmedChunk.length, // Approximate token count
          chunkIndex: i
        });
        
      } catch (error) {
        console.error(`Failed to process chunk ${i}:`, error.message);
        throw new Error(`Failed to generate embedding for chunk ${i}: ${error.message}`);
      }
    }
    
    if (chunksWithEmbeddings.length === 0) {
      throw new Error('No valid chunks were processed');
    }
    

    let knowledgeBase;
    
    if (knowledgeBaseId) {
      // Add to existing knowledge base
      knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId);
      if (!knowledgeBase) {
        await deleteFile(filePath);
        return res.status(404).json({ error: 'Knowledge base not found' });
      }
      
      knowledgeBase.files.push({
        filename,
        originalName,
        size,
        chunks: chunksWithEmbeddings
      });
      
      knowledgeBase.totalChunks += chunksWithEmbeddings.length;
      knowledgeBase.totalTokens += processedData.tokenCount;
    } else {
      // Create new knowledge base
      knowledgeBase = new KnowledgeBase({
        name: knowledgeBaseName,
        description: description || '',
        files: [{
          filename,
          originalName,
          size,
          chunks: chunksWithEmbeddings
        }],
        totalChunks: chunksWithEmbeddings.length,
        totalTokens: processedData.tokenCount
      });
    }

    await knowledgeBase.save();

    // Store embeddings in Pinecone
    const index = getIndex();
    const vectors = chunksWithEmbeddings.map((chunk, i) => ({
      id: `${knowledgeBase._id}_${filename}_${i}`,
      values: chunk.embedding,
      metadata: {
        knowledgeBaseId: knowledgeBase._id.toString(),
        knowledgeBaseName: knowledgeBase.name,
        filename,
        chunkIndex: i,
        text: chunk.text.substring(0, 1000) // Store first 1000 chars for metadata
      }
    }));

    await index.upsert(vectors);

    // Clean up uploaded file
    await deleteFile(filePath);

    res.json({
      success: true,
      knowledgeBase: {
        id: knowledgeBase._id,
        name: knowledgeBase.name,
        description: knowledgeBase.description,
        totalChunks: knowledgeBase.totalChunks,
        totalTokens: knowledgeBase.totalTokens,
        files: knowledgeBase.files.map(file => ({
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          uploadDate: file.uploadDate,
          chunks: file.chunks.length
        }))
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process file',
      details: error.message 
    });
  }
});

// Get upload status (for progress tracking)
router.get('/status/:jobId', async (req, res) => {
  // This could be implemented with Redis or similar for real-time status updates
  res.json({ status: 'completed' });
});

export default router;
