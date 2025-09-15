const express = require('express');
const { getIndex } = require('../config/pinecone');
const KnowledgeBase = require('../models/KnowledgeBase');

const router = express.Router();

// Import existing Pinecone data
router.post('/pinecone', async (req, res) => {
  try {
    const { knowledgeBaseName, description } = req.body;
    
    if (!knowledgeBaseName) {
      return res.status(400).json({ error: 'Knowledge base name is required' });
    }

    const index = getIndex();
    
    // Query all vectors from Pinecone
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0), // Dummy vector to get all data
      topK: 10000, // Get all vectors
      includeMetadata: true
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return res.status(404).json({ error: 'No data found in Pinecone' });
    }

    // Group vectors by knowledge base (assuming they have metadata with kb info)
    const vectorsByKB = {};
    
    for (const match of queryResponse.matches) {
      const metadata = match.metadata || {};
      const kbName = metadata.knowledgeBase || knowledgeBaseName;
      
      if (!vectorsByKB[kbName]) {
        vectorsByKB[kbName] = [];
      }
      vectorsByKB[kbName].push(match);
    }

    const createdKBs = [];

    // Create knowledge bases for each group
    for (const [kbName, vectors] of Object.entries(vectorsByKB)) {
      // Check if knowledge base already exists
      let knowledgeBase = await KnowledgeBase.findOne({ name: kbName });
      
      if (!knowledgeBase) {
        // Create new knowledge base
        knowledgeBase = new KnowledgeBase({
          name: kbName,
          description: description || `Imported from existing Pinecone data`,
          totalChunks: vectors.length,
          totalTokens: vectors.reduce((sum, v) => sum + (v.metadata?.tokenCount || 0), 0),
          files: [{
            filename: 'imported_data',
            originalName: 'Imported Data',
            size: 0,
            chunks: vectors.map(v => ({
              text: v.metadata?.text || '',
              tokenCount: v.metadata?.tokenCount || 0,
              embedding: v.values
            })),
            uploadDate: new Date()
          }]
        });
        
        await knowledgeBase.save();
        createdKBs.push(knowledgeBase);
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${createdKBs.length} knowledge base(s)`,
      knowledgeBases: createdKBs.map(kb => ({
        id: kb._id,
        name: kb.name,
        description: kb.description,
        totalChunks: kb.totalChunks,
        totalTokens: kb.totalTokens
      }))
    });

  } catch (error) {
    console.error('Error importing Pinecone data:', error);
    res.status(500).json({ 
      error: 'Failed to import Pinecone data',
      details: error.message 
    });
  }
});

// List all vectors in Pinecone (for debugging)
router.get('/pinecone/vectors', async (req, res) => {
  try {
    const index = getIndex();
    
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0),
      topK: 100,
      includeMetadata: true
    });

    res.json({
      success: true,
      totalVectors: queryResponse.matches?.length || 0,
      vectors: queryResponse.matches?.map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata
      })) || []
    });

  } catch (error) {
    console.error('Error listing Pinecone vectors:', error);
    res.status(500).json({ 
      error: 'Failed to list Pinecone vectors',
      details: error.message 
    });
  }
});

module.exports = router;
