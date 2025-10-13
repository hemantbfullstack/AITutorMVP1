import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import EducationalCriteria from '../models/KnowledgeBase.js';
import ChatSession from '../models/ChatSession.js';
import ChatRoom from '../models/ChatRoom.js';
import { generateEmbedding, generateResponse } from '../config/openai.js';
import { getIndex } from '../config/pinecone.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkUsage } from '../checkUsageMiddleware.js';
import { 
  getHardcodedCriteria, 
  isHardcodedCriteria
} from '../utils/hardcodedCriteria.js';

const router = express.Router();

// Get available knowledge bases
router.get('/knowledge-bases', authenticateToken, async (req: any, res: any) => {
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
  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge bases' });
  }
});


// Create new chat session
router.post('/session', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { knowledgeBaseId, title, level } = req.body;

    // Validate required parameters
    if (!knowledgeBaseId) {
      return res.status(400).json({ error: 'Knowledge Base ID is required' });
    }

    // Get the knowledge base from database
    const knowledgeBase = await EducationalCriteria.findById(knowledgeBaseId);
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge Base not found' });
    }

    // Extract tutor type from the knowledge base name or level
    const tutorType = knowledgeBase.name.includes('AA') || knowledgeBase.level.includes('AA') ? 'AA' : 
                     knowledgeBase.name.includes('AI') || knowledgeBase.level.includes('AI') ? 'AI' : 'Unknown';
    
    // Use the level passed from frontend, or extract from knowledge base as fallback
    const selectedLevel = level || (knowledgeBase.level.includes('SL') ? 'SL' : knowledgeBase.level.includes('HL') ? 'HL' : 'Unknown');

    // Create chat session with knowledge base
    const sessionId = uuidv4();
    const chatSession = new ChatSession({
      sessionId,
      userId,
      roomId: null, // Room will be linked later by frontend
      criteriaId: knowledgeBaseId, // Use knowledge base ID directly
      title: title || `${knowledgeBase.name}`,
      messages: [],
      // Store additional metadata
      metadata: {
        knowledgeBaseId: knowledgeBaseId,
        tutorType: tutorType,
        level: selectedLevel,
        educationalBoard: knowledgeBase.educationalBoard,
        subject: knowledgeBase.subject,
        fullLevel: `${tutorType} ${selectedLevel}`
      }
    });

    await chatSession.save();

    res.json({
      success: true,
      session: {
        sessionId,
        knowledgeBaseId: knowledgeBaseId,
        tutorName: `IB Mathematics ${tutorType} Tutor`,
        criteriaName: knowledgeBase.name,
        educationalBoard: knowledgeBase.educationalBoard,
        subject: knowledgeBase.subject,
        tutorType: tutorType,
        level: selectedLevel,
        fullLevel: `${tutorType} ${selectedLevel}`,
        title: chatSession.title,
        createdAt: chatSession.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

router.post("/message", authenticateToken, checkUsage, async (req: any, res: any) => {
  try {
    const { sessionId, message, isVoice = false } = req.body;
    const userId = req.user.id;

    if (!sessionId || !message) {
      return res
        .status(400)
        .json({ error: "Session ID and message are required" });
    }

    // Get chat session
    const chatSession = await ChatSession.findOne({ sessionId });
    if (!chatSession) {
      return res.status(404).json({ error: "Chat session not found" });
    }

    // Get knowledge base information
    let knowledgeBase;
    
    // Check if this is a new format session (with metadata)
    if (chatSession.metadata && chatSession.metadata.knowledgeBaseId) {
      knowledgeBase = await EducationalCriteria.findById(chatSession.metadata.knowledgeBaseId);
    } else {
      // Legacy format - try to get from criteriaId
      if (isHardcodedCriteria(chatSession.criteriaId)) {
        const legacyCriteria = getHardcodedCriteria(chatSession.criteriaId);
        if (legacyCriteria) {
          // Map legacy criteria to knowledge base structure
          knowledgeBase = {
            _id: legacyCriteria.id,
            name: legacyCriteria.name,
            description: legacyCriteria.description,
            educationalBoard: legacyCriteria.educationalBoard,
            subject: legacyCriteria.subject,
            level: legacyCriteria.level,
            totalChunks: legacyCriteria.totalChunks,
            totalTokens: legacyCriteria.totalTokens
          };
        }
      } else {
        // Get from database
        knowledgeBase = await EducationalCriteria.findById(chatSession.criteriaId);
      }
    }
    
    if (!knowledgeBase) {
      return res.status(404).json({ error: "Knowledge Base not found" });
    }

    // Get tutor type and level from session metadata (preferred) or extract from knowledge base
    let tutorType, level;
    
    if (chatSession.metadata && chatSession.metadata.tutorType && chatSession.metadata.level) {
      // Use stored metadata from session creation
      tutorType = chatSession.metadata.tutorType;
      level = chatSession.metadata.level;
      console.log('Using session metadata:', { tutorType, level });
    } else {
      // Fallback: extract from knowledge base
      tutorType = knowledgeBase.name.includes('AA') || knowledgeBase.level.includes('AA') ? 'AA' : 
                 knowledgeBase.name.includes('AI') || knowledgeBase.level.includes('AI') ? 'AI' : 'Unknown';
      level = knowledgeBase.level.includes('SL') ? 'SL' : knowledgeBase.level.includes('HL') ? 'HL' : 'Unknown';
      console.log('Using fallback extraction:', { tutorType, level, knowledgeBaseName: knowledgeBase.name, knowledgeBaseLevel: knowledgeBase.level });
    }
    
    const startTime = Date.now();

    // Generate embedding for user message to find relevant instructional criteria
    const queryEmbedding = await generateEmbedding(message);

    // Query Pinecone for instructional criteria using the knowledge base
    let searchResponse: any = { matches: [] };
    let pineconeAvailable = false;

    try {
      const index = getIndex();
      if (index && typeof index.query === "function") {
        searchResponse = await index.query({
          vector: queryEmbedding,
          topK: 5, // Get fewer, more focused instructional criteria
          includeMetadata: true,
          filter: {
            criteriaId: knowledgeBase._id, // Use knowledge base ID
          },
        });

        pineconeAvailable = true;
      }
    } catch (err) {
      console.warn("⚠️ Pinecone search failed:", err);
    }

    // Build instructional context from criteria matches
    let instructionalContext = "";
    let hasRelevantCriteria = false;

    if (searchResponse.matches && searchResponse.matches.length > 0) {
      const relevantMatches = searchResponse.matches.filter(
        (m: any) => m.score > 0.3 // Higher threshold for instructional relevance
      );

      if (relevantMatches.length > 0) {
        instructionalContext = relevantMatches
          .map((m: any) => m.metadata?.text || "")
          .join("\n\n");
        hasRelevantCriteria = true;
      }
    }

    // Generate response using instructional criteria as guidance
    let response: string;
    
    // Check if this is a casual conversation (greetings, how are you, etc.)
    const isCasualConversation = /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|how's it going|what's up|thanks|thank you|bye|goodbye|see you|nice to meet you|pleasure|how do you do|good to see you|great to meet you|howdy|sup|what's happening|how's your day|how's everything|what's new|how's life)/i.test(message.trim());
    
    if (isCasualConversation) {
      const messages = [
        {
          role: "system",
          content: `You are a friendly AI tutor specialized in ${knowledgeBase.educationalBoard} ${knowledgeBase.subject} ${tutorType} education at ${level} level.

You can handle both casual conversation and educational questions:

FOR CASUAL CONVERSATION (greetings, how are you, etc.):
- Be warm, friendly, and conversational
- Keep responses brief and natural
- Mention that you're ready to help with educational questions
- Examples: "Hi! I'm doing great, thank you! I'm here to help you with ${knowledgeBase.subject} ${tutorType} ${level} questions. What would you like to learn about?"

FOR EDUCATIONAL QUESTIONS:
- You are ONLY authorized to teach ${knowledgeBase.educationalBoard} ${knowledgeBase.subject} ${tutorType} ${level} level content
- If a question is beyond ${level} level, politely decline and suggest the appropriate level
- Use your knowledge of ${knowledgeBase.educationalBoard} ${knowledgeBase.subject} ${tutorType} curriculum at ${level} level ONLY
- Follow the instructional guidelines and teaching approaches from the knowledge base
- Provide clear, structured explanations (steps, bullet points, equations)
- Keep answers educational and aligned with the curriculum standards

LEVEL RESTRICTION POLICY:
- For ${level}: Only answer questions appropriate for this level
- If asked about higher level content, say: "This question is beyond your selected Criteria (${level}). For this topic, you would need ${level === 'SL' ? 'HL' : 'a higher level'} level instruction."
- Always stay within the scope of ${level} curriculum

TUTOR-SPECIFIC FOCUS:
${tutorType === 'AA' ? 
  '- Analysis & Approaches: Focus on pure mathematics, calculus, algebra, functions, and analytical methods' :
  '- Applications & Interpretation: Focus on applied mathematics, statistics, modeling, and real-world applications'
}

LEVEL-SPECIFIC RESTRICTIONS:
${level === 'SL' ? 
  '- SL: Focus on fundamental concepts, basic applications, and standard problem-solving methods' :
  '- HL: Can handle advanced concepts, complex applications, and sophisticated problem-solving techniques'
}

Knowledge Base Guidelines:
${instructionalContext || `Use the specific guidelines and content from the ${knowledgeBase.name} knowledge base. Follow ${knowledgeBase.educationalBoard} ${knowledgeBase.subject} ${knowledgeBase.level} teaching approaches and curriculum standards.`}`,
        },
        { role: "user", content: message },
      ];

      response = await generateResponse(messages);
    } else {
      const messages = [
        {
          role: "system",
          content: `You are an AI tutor specialized in ${knowledgeBase.educationalBoard} ${knowledgeBase.subject} ${tutorType} education at ${level} level.

CRITICAL INSTRUCTIONS:
- You are ONLY authorized to teach ${knowledgeBase.educationalBoard} ${knowledgeBase.subject} ${tutorType} ${level} level content
- If a question is beyond ${level} level, politely decline and suggest the appropriate level
- Use your knowledge of ${knowledgeBase.educationalBoard} ${knowledgeBase.subject} ${tutorType} curriculum at ${level} level ONLY
- Follow the instructional guidelines and teaching approaches provided below
- Provide clear, structured explanations (steps, bullet points, equations)
- Keep answers educational and aligned with the curriculum standards
- Use appropriate terminology and concepts for ${level} level
- Follow ${knowledgeBase.educationalBoard} assessment criteria and command terms

LEVEL RESTRICTION POLICY:
- For ${level}: Only answer questions appropriate for this level
- If asked about higher level content, say: "This question is beyond your selected Criteria (${level}). For this topic, you would need ${level === 'SL' ? 'HL' : 'a higher level'} level instruction."
- Always stay within the scope of ${level} curriculum

TUTOR-SPECIFIC FOCUS:
${tutorType === 'AA' ? 
  '- Analysis & Approaches: Focus on pure mathematics, calculus, algebra, functions, and analytical methods' :
  '- Applications & Interpretation: Focus on applied mathematics, statistics, modeling, and real-world applications'
}

LEVEL-SPECIFIC RESTRICTIONS:
${level === 'SL' ? 
  '- SL: Focus on fundamental concepts, basic applications, and standard problem-solving methods' :
  '- HL: Can handle advanced concepts, complex applications, and sophisticated problem-solving techniques'
}

Knowledge Base Guidelines:
${instructionalContext || `Use the specific guidelines and content from the ${knowledgeBase.name} knowledge base. Follow ${knowledgeBase.educationalBoard} ${knowledgeBase.subject} ${knowledgeBase.level} teaching approaches and curriculum standards.`}`,
        },
        { role: "user", content: message },
      ];

      response = await generateResponse(messages);
    }

    const responseTime = Date.now() - startTime;

    // Save session messages
    chatSession.messages.push({
      role: "user",
      content: message,
      isVoice,
      metadata: {
        knowledgeBase: knowledgeBase.name,
        tutorType: tutorType,
        level: level,
        fullLevel: knowledgeBase.level,
        responseTime: 0,
      },
    });

    chatSession.messages.push({
      role: "assistant",
      content: response,
      metadata: {
        knowledgeBase: knowledgeBase.name,
        tutorType: tutorType,
        level: level,
        fullLevel: knowledgeBase.level,
        tokensUsed: response.length,
        responseTime,
        criteriaUsed: hasRelevantCriteria,
      },
    });

    chatSession.totalTokensUsed += response.length;
    await chatSession.save();

    // Update ChatRoom message count and last message time
    if (chatSession.roomId) {
      await ChatRoom.findOneAndUpdate(
        { roomId: chatSession.roomId, userId },
        { 
          messageCount: chatSession.messages.length,
          lastMessageAt: new Date()
        }
      );
    }

    res.json({
      success: true,
      response: {
        content: response,
        sessionId,
        responseTime,
        criteriaUsed: hasRelevantCriteria,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Error processing message:", err);
    res
      .status(500)
      .json({ error: "Failed to process message", details: err.message });
  }
});

// Get chat history by sessionId
router.get('/session/:sessionId', authenticateToken, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const chatSession = await ChatSession.findOne({ sessionId, userId });
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Get knowledge base information
    let knowledgeBase;
    
    // Check if this is a new format session (with metadata)
    if (chatSession.metadata && chatSession.metadata.knowledgeBaseId) {
      knowledgeBase = await EducationalCriteria.findById(chatSession.metadata.knowledgeBaseId);
    } else {
      // Legacy format - try to get from criteriaId
      if (isHardcodedCriteria(chatSession.criteriaId)) {
        const legacyCriteria = getHardcodedCriteria(chatSession.criteriaId);
        if (legacyCriteria) {
          knowledgeBase = {
            _id: legacyCriteria.id,
            name: legacyCriteria.name,
            description: legacyCriteria.description,
            educationalBoard: legacyCriteria.educationalBoard,
            subject: legacyCriteria.subject,
            level: legacyCriteria.level
          };
        }
      } else {
        knowledgeBase = await EducationalCriteria.findById(chatSession.criteriaId);
      }
    }

    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge Base not found' });
    }

    const tutorType = knowledgeBase.level.includes('AA') ? 'AA' : knowledgeBase.level.includes('AI') ? 'AI' : 'Unknown';
    const level = knowledgeBase.level.includes('SL') ? 'SL' : knowledgeBase.level.includes('HL') ? 'HL' : 'Unknown';

    res.json({
      success: true,
      session: {
        sessionId: chatSession.sessionId,
        roomId: chatSession.roomId,
        knowledgeBaseId: knowledgeBase._id,
        tutorName: `IB Mathematics ${tutorType} Tutor`,
        criteriaName: knowledgeBase.name,
        educationalBoard: knowledgeBase.educationalBoard,
        subject: knowledgeBase.subject,
        tutorType: tutorType,
        level: level,
        fullLevel: knowledgeBase.level,
        title: chatSession.title,
        messages: chatSession.messages,
        totalTokensUsed: chatSession.totalTokensUsed,
        createdAt: chatSession.createdAt,
        lastActivity: chatSession.lastActivity
      }
    });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ error: 'Failed to fetch chat session' });
  }
});

// Get chat history by roomId
router.get('/room/:roomId', authenticateToken, async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Verify room exists and user has access
    const room = await ChatRoom.findOne({ roomId, userId });
    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const chatSession = await ChatSession.findOne({ roomId, userId });
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Get knowledge base information
    let knowledgeBase;
    
    // Check if this is a new format session (with metadata)
    if (chatSession.metadata && chatSession.metadata.knowledgeBaseId) {
      knowledgeBase = await EducationalCriteria.findById(chatSession.metadata.knowledgeBaseId);
    } else {
      // Legacy format - try to get from criteriaId
      if (isHardcodedCriteria(chatSession.criteriaId)) {
        const legacyCriteria = getHardcodedCriteria(chatSession.criteriaId);
        if (legacyCriteria) {
          knowledgeBase = {
            _id: legacyCriteria.id,
            name: legacyCriteria.name,
            description: legacyCriteria.description,
            educationalBoard: legacyCriteria.educationalBoard,
            subject: legacyCriteria.subject,
            level: legacyCriteria.level
          };
        }
      } else {
        knowledgeBase = await EducationalCriteria.findById(chatSession.criteriaId);
      }
    }

    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge Base not found' });
    }

    const tutorType = knowledgeBase.level.includes('AA') ? 'AA' : knowledgeBase.level.includes('AI') ? 'AI' : 'Unknown';
    const level = knowledgeBase.level.includes('SL') ? 'SL' : knowledgeBase.level.includes('HL') ? 'HL' : 'Unknown';

    res.json({
      success: true,
      session: {
        sessionId: chatSession.sessionId,
        roomId: chatSession.roomId,
        knowledgeBaseId: knowledgeBase._id,
        tutorName: `IB Mathematics ${tutorType} Tutor`,
        criteriaName: knowledgeBase.name,
        educationalBoard: knowledgeBase.educationalBoard,
        subject: knowledgeBase.subject,
        tutorType: tutorType,
        level: level,
        fullLevel: knowledgeBase.level,
        title: chatSession.title,
        messages: chatSession.messages,
        totalTokensUsed: chatSession.totalTokensUsed,
        createdAt: chatSession.createdAt,
        lastActivity: chatSession.lastActivity
      }
    });
  } catch (error) {
    console.error('Error fetching chat session by room:', error);
    res.status(500).json({ error: 'Failed to fetch chat session' });
  }
});

// Get user's chat sessions
router.get('/sessions', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sessions = await ChatSession.find({ userId })
      .select('sessionId roomId criteriaId title messages totalTokensUsed createdAt lastActivity metadata')
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await ChatSession.countDocuments({ userId });

    res.json({
      success: true,
      sessions: await Promise.all(sessions.map(async (session) => {
        // Get knowledge base information
        let knowledgeBase;
        
        // Check if this is a new format session (with metadata)
        if (session.metadata && session.metadata.knowledgeBaseId) {
          knowledgeBase = await EducationalCriteria.findById(session.metadata.knowledgeBaseId);
        } else {
          // Legacy format - try to get from criteriaId
          if (isHardcodedCriteria(session.criteriaId)) {
            const legacyCriteria = getHardcodedCriteria(session.criteriaId);
            if (legacyCriteria) {
              knowledgeBase = {
                _id: legacyCriteria.id,
                name: legacyCriteria.name,
                description: legacyCriteria.description,
                educationalBoard: legacyCriteria.educationalBoard,
                subject: legacyCriteria.subject,
                level: legacyCriteria.level
              };
            }
          } else {
            knowledgeBase = await EducationalCriteria.findById(session.criteriaId);
          }
        }

        if (!knowledgeBase) {
          return {
            sessionId: session.sessionId,
            roomId: session.roomId,
            knowledgeBaseId: null,
            tutorName: 'Unknown Tutor',
            criteriaName: 'Unknown Criteria',
            educationalBoard: 'Unknown',
            subject: 'Unknown',
            tutorType: 'Unknown',
            level: 'Unknown',
            fullLevel: 'Unknown',
            title: session.title,
            messageCount: session.messages.length,
            totalTokensUsed: session.totalTokensUsed,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity
          };
        }

        const tutorType = knowledgeBase.level.includes('AA') ? 'AA' : knowledgeBase.level.includes('AI') ? 'AI' : 'Unknown';
        const level = knowledgeBase.level.includes('SL') ? 'SL' : knowledgeBase.level.includes('HL') ? 'HL' : 'Unknown';

        return {
          sessionId: session.sessionId,
          roomId: session.roomId,
          knowledgeBaseId: knowledgeBase._id,
          tutorName: `IB Mathematics ${tutorType} Tutor`,
          criteriaName: knowledgeBase.name,
          educationalBoard: knowledgeBase.educationalBoard,
          subject: knowledgeBase.subject,
          tutorType: tutorType,
          level: level,
          fullLevel: knowledgeBase.level,
          title: session.title,
          messageCount: session.messages.length,
          totalTokensUsed: session.totalTokensUsed,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity
        };
      })),
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
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

// Create new chat (save current and start new)
router.post('/new-chat', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { criteriaId, title } = req.body;

    if (!criteriaId) {
      return res.status(400).json({ error: 'Educational criteria ID is required' });
    }

    // Verify educational criteria exists
    const criteria = await EducationalCriteria.findById(criteriaId);
    if (!criteria) {
      return res.status(404).json({ error: 'Educational criteria not found' });
    }

    // Create new chat room
    const roomId = uuidv4();
    const chatRoom = new ChatRoom({
      roomId,
      userId,
      title: title || `${criteria.name} Chat`,
      type: 'educational-criteria',
      criteriaId,
      messageCount: 0,
      lastMessageAt: new Date(),
      ttsSettings: {
        selectedVoiceId: 'alloy',
        autoPlayVoice: false,
        volume: 0.7
      }
    });

    await chatRoom.save();

    // Create new chat session
    const sessionId = uuidv4();
    const chatSession = new ChatSession({
      sessionId,
      userId,
      roomId,
      criteriaId,
      title: title || `${criteria.name} Chat`,
      messages: []
    });

    await chatSession.save();

    res.json({
      success: true,
      session: {
        sessionId,
        roomId,
        criteriaId,
        criteriaName: criteria.name,
        educationalBoard: criteria.educationalBoard,
        subject: criteria.subject,
        level: criteria.level,
        title: chatSession.title,
        createdAt: chatSession.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating new chat:', error);
    res.status(500).json({ error: 'Failed to create new chat' });
  }
});

// Update chat session
router.put('/session/:sessionId', authenticateToken, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { roomId } = req.body;

    const chatSession = await ChatSession.findOneAndUpdate(
      { sessionId, userId },
      { roomId },
      { new: true }
    );

    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({
      success: true,
      session: {
        sessionId: chatSession.sessionId,
        roomId: chatSession.roomId,
        criteriaId: chatSession.criteriaId,
        title: chatSession.title,
        createdAt: chatSession.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating chat session:', error);
    res.status(500).json({ error: 'Failed to update chat session' });
  }
});

// Delete chat session
router.delete('/session/:sessionId', authenticateToken, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const chatSession = await ChatSession.findOne({ sessionId, userId });
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Delete associated chat room if it exists
    if (chatSession.roomId) {
      await ChatRoom.deleteOne({ roomId: chatSession.roomId, userId });
    }

    // Delete the session
    await ChatSession.deleteOne({ sessionId, userId });

    res.json({ success: true, message: 'Chat session deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

// Debug route to get all rooms (for debugging)
router.get('/debug/rooms', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const allRooms = await ChatRoom.find({});
    const userRooms = await ChatRoom.find({ userId });
    
    res.json({
      success: true,
      userId,
      allRoomsCount: allRooms.length,
      userRoomsCount: userRooms.length,
      allRooms: allRooms.map(room => ({
        roomId: room.roomId,
        userId: room.userId,
        title: room.title,
        type: room.type
      })),
      userRooms: userRooms.map(room => ({
        roomId: room.roomId,
        userId: room.userId,
        title: room.title,
        type: room.type
      }))
    });
  } catch (error) {
    console.error('Debug rooms error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

export default router;
