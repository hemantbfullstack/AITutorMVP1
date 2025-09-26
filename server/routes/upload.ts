import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import EducationalCriteria from '../models/KnowledgeBase.js';
import { processFile, saveFile, deleteFile } from '../utils/fileProcessor.js';
import { generateEmbedding } from '../config/openai.js';
import { getIndex } from '../config/pinecone.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '15728640'), // 15MB default
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
router.post('/', upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { criteriaName, criteriaId, description, educationalBoard, subject, level } = req.body;
    
    if (!criteriaName && !criteriaId) {
      return res.status(400).json({ error: 'Educational criteria name or ID is required' });
    }

    if (!criteriaId && (!educationalBoard || !subject || !level)) {
      return res.status(400).json({ error: 'Educational board, subject, and level are required for new criteria' });
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
    const chunksWithEmbeddings: any[] = [];
    
    // Check Pinecone metadata size limit (40KB per vector)
    const maxMetadataSize = 40 * 1024; // 40KB limit
    const averageChunkSize = 8000; // Average chunk text size
    const metadataOverhead = 1000; // Estimated overhead for other metadata fields
    const maxTextSize = maxMetadataSize - metadataOverhead;
    
    
    // Check if any chunk exceeds Pinecone metadata limit
    const oversizedChunks = processedData.chunks.filter(chunk => chunk.length > maxTextSize);
    if (oversizedChunks.length > 0) {
      await deleteFile(filePath);
      return res.status(400).json({ 
        error: 'File contains chunks too large for Pinecone',
        details: `Found ${oversizedChunks.length} chunks that exceed Pinecone's 40KB metadata limit. Please split the file into smaller parts or use a file with less dense content.`,
        maxTextSize: maxTextSize,
        oversizedChunks: oversizedChunks.length
      });
    }
    
    // Process chunks in parallel batches for better performance
    const BATCH_SIZE = 10; // Process 10 chunks at a time
    const chunks = processedData.chunks;
    
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const globalIndex = i + batchIndex;
        
        // Validate chunk text
        if (!chunk || typeof chunk !== 'string' || chunk.trim().length === 0) {
          console.warn(`Skipping empty chunk ${globalIndex}`);
          return null;
        }
        
        // Ensure chunk is not too long for Pinecone metadata (40KB limit)
        let trimmedChunk = chunk.trim();
        if (trimmedChunk.length > maxTextSize) {
          console.warn(`Chunk ${globalIndex} too long for Pinecone metadata, truncating`);
          trimmedChunk = trimmedChunk.substring(0, maxTextSize);
        }
        
        try {
          const embedding = await generateEmbedding(trimmedChunk);
          return {
            text: trimmedChunk,
            embedding,
            tokenCount: trimmedChunk.length,
            chunkIndex: globalIndex
          };
        } catch (error: any) {
          console.error(`Failed to process chunk ${globalIndex}:`, error.message);
          throw new Error(`Failed to generate embedding for chunk ${globalIndex}: ${error.message}`);
        }
      });
      
      try {
        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(result => result !== null);
        chunksWithEmbeddings.push(...validResults);
        
      } catch (error) {
        console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error);
        throw error;
      }
    }
    
    if (chunksWithEmbeddings.length === 0) {
      throw new Error('No valid chunks were processed');
    }
    

    let criteria;
    
    if (criteriaId) {
      // Add to existing educational criteria
      criteria = await EducationalCriteria.findById(criteriaId);
      if (!criteria) {
        await deleteFile(filePath);
        return res.status(404).json({ error: 'Educational criteria not found' });
      }
      
      criteria.files.push({
        filename,
        originalName,
        size,
        chunkCount: chunksWithEmbeddings.length
      });
      
      criteria.totalChunks += chunksWithEmbeddings.length;
      criteria.totalTokens += processedData.tokenCount;
    } else {
      // Create new educational criteria
      criteria = new EducationalCriteria({
        name: criteriaName,
        description: description || '',
        educationalBoard,
        subject,
        level,
        files: [{
          filename,
          originalName,
          size,
          chunkCount: chunksWithEmbeddings.length
        }],
        totalChunks: chunksWithEmbeddings.length,
        totalTokens: processedData.tokenCount
      });
    }

    try {
      await criteria.save();
    } catch (error: any) {
      await deleteFile(filePath);
      if (error.message && error.message.includes('BSONObj size')) {
        return res.status(400).json({ 
          error: 'File too large for processing',
          details: 'The processed file exceeds MongoDB document size limits. Please split the file into smaller parts or use a file with less content.',
          suggestion: 'Try splitting your document into smaller sections or using a file with less text content.'
        });
      }
      throw error;
    }

    // Store embeddings in Pinecone (if available) with batch optimization
    try {
      const index = getIndex();
      
      // Check if we have a real Pinecone index or mock
      if (index && typeof index.upsert === 'function') {
        
        const PINECONE_BATCH_SIZE = 100; // Pinecone recommends batches of 100
        const vectors = chunksWithEmbeddings.map((chunk, i) => ({
          id: `${criteria._id}_${filename}_${chunk.chunkIndex}`,
          values: chunk.embedding,
          metadata: {
            criteriaId: criteria._id.toString(),
            criteriaName: criteria.name,
            educationalBoard: criteria.educationalBoard,
            subject: criteria.subject,
            level: criteria.level,
            filename,
            chunkIndex: chunk.chunkIndex,
            text: chunk.text, // Store FULL text in Pinecone metadata
            tokenCount: chunk.tokenCount
          }
        }));

        // Upload in batches to Pinecone
        for (let i = 0; i < vectors.length; i += PINECONE_BATCH_SIZE) {
          const batch = vectors.slice(i, i + PINECONE_BATCH_SIZE);
          await index.upsert(batch);
        }
        
      } else {
        console.warn('⚠️ Pinecone not available - vectors not stored in vector database');
      }
    } catch (error) {
      console.warn('⚠️ Failed to store vectors in Pinecone:', error);
      // Continue without Pinecone - the educational criteria will still be saved in MongoDB
    }

    // Clean up uploaded file
    await deleteFile(filePath);

    res.json({
      success: true,
      criteria: {
        id: criteria._id,
        name: criteria.name,
        description: criteria.description,
        educationalBoard: criteria.educationalBoard,
        subject: criteria.subject,
        level: criteria.level,
        totalChunks: criteria.totalChunks,
        totalTokens: criteria.totalTokens,
        files: criteria.files.map((file: any) => ({
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          uploadDate: file.uploadDate,
          chunkCount: file.chunkCount
        }))
      }
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process file',
      details: error.message 
    });
  }
});

// Get upload status (for progress tracking)
router.get('/status/:jobId', async (req: any, res: any) => {
  // This could be implemented with Redis or similar for real-time status updates
  res.json({ status: 'completed' });
});

// Upload progress tracking (in-memory for now, could be Redis in production)
const uploadProgress = new Map();

// Helper function to update progress
const updateProgress = (jobId: string, progress: number, status: string, message?: string) => {
  uploadProgress.set(jobId, {
    progress,
    status,
    message,
    timestamp: new Date().toISOString()
  });
};

// Get upload progress
router.get('/progress/:jobId', async (req: any, res: any) => {
  const { jobId } = req.params;
  const progress = uploadProgress.get(jobId);
  
  if (!progress) {
    return res.status(404).json({ error: 'Upload job not found' });
  }
  
  res.json(progress);
});

export default router;
