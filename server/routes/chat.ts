import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import EducationalCriteria from '../models/KnowledgeBase.js';
import ChatSession from '../models/ChatSession.js';
import { generateEmbedding, generateResponse } from '../config/openai.js';
import { getIndex } from '../config/pinecone.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkUsage } from '../checkUsageMiddleware.js';

const router = express.Router();

// Create new chat session
router.post('/session', authenticateToken, async (req: any, res: any) => {
  try {
    const { criteriaId } = req.body;

    if (!criteriaId) {
      return res.status(400).json({ error: 'Educational criteria ID is required' });
    }

    // Verify educational criteria exists
    const criteria = await EducationalCriteria.findById(criteriaId);
    if (!criteria) {
      return res.status(404).json({ error: 'Educational criteria not found' });
    }

    const sessionId = uuidv4();
    const chatSession = new ChatSession({
      sessionId,
      criteriaId,
      messages: []
    });

    await chatSession.save();

    res.json({
      success: true,
      session: {
        sessionId,
        criteriaId,
        criteriaName: criteria.name,
        educationalBoard: criteria.educationalBoard,
        subject: criteria.subject,
        level: criteria.level,
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

    if (!sessionId || !message) {
      return res
        .status(400)
        .json({ error: "Session ID and message are required" });
    }

    // Get chat session
    const chatSession = await ChatSession.findOne({ sessionId }).populate(
      "criteriaId"
    );
    if (!chatSession) {
      return res.status(404).json({ error: "Chat session not found" });
    }

    console.log(
      "🎯 Using educational criteria:",
      chatSession.criteriaId._id.toString()
    );
    console.log("📝 User message:", message);

    const startTime = Date.now();

    // Generate embedding for user message to find relevant instructional criteria
    const queryEmbedding = await generateEmbedding(message);
    console.log("🧮 Embedding length:", queryEmbedding.length);

    // Query Pinecone for instructional criteria
    let searchResponse: any = { matches: [] };
    let pineconeAvailable = false;

    try {
      const index = getIndex();
      console.log("🌲 Pinecone index:", index);
      if (index && typeof index.query === "function") {
        searchResponse = await index.query({
          vector: queryEmbedding,
          topK: 5, // Get fewer, more focused instructional criteria
          includeMetadata: true,
          filter: {
            criteriaId: chatSession.criteriaId._id.toString(),
          },
        });

        pineconeAvailable = true;
        console.log(
          "🎯 Found instructional criteria:",
          searchResponse.matches?.length || 0,
          "matches"
        );
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

      console.log("✅ Relevant instructional criteria:", relevantMatches.length);

      if (relevantMatches.length > 0) {
        instructionalContext = relevantMatches
          .map((m: any) => m.metadata?.text || "")
          .join("\n\n");
        hasRelevantCriteria = true;
        console.log("📚 Instructional context length:", instructionalContext.length);
        console.log("📄 Instructional context preview:", instructionalContext.substring(0, 200) + "...");
      } else {
        console.log("❌ No instructional criteria above threshold 0.3");
        console.log("📊 All scores:", searchResponse.matches.map((m: any) => m.score));
      }
    }

    // Generate response using instructional criteria as guidance
    let response: string;
    
    // Check if this is a casual conversation (greetings, how are you, etc.)
    const isCasualConversation = /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|how's it going|what's up|thanks|thank you|bye|goodbye|see you|nice to meet you|pleasure|how do you do|good to see you|great to meet you|howdy|sup|what's happening|how's your day|how's everything|what's new|how's life)/i.test(message.trim());
    
    if (isCasualConversation) {
      console.log("💬 Handling casual conversation");
      const messages = [
        {
          role: "system",
          content: `You are a friendly AI tutor specialized in ${chatSession.criteriaId.educationalBoard} ${chatSession.criteriaId.subject} ${chatSession.criteriaId.level} education. 

You can handle both casual conversation and educational questions:

FOR CASUAL CONVERSATION (greetings, how are you, etc.):
- Be warm, friendly, and conversational
- Keep responses brief and natural
- Mention that you're ready to help with educational questions
- Examples: "Hi! I'm doing great, thank you! I'm here to help you with ${chatSession.criteriaId.subject} ${chatSession.criteriaId.level} questions. What would you like to learn about?"

FOR EDUCATIONAL QUESTIONS:
- Use your knowledge of ${chatSession.criteriaId.educationalBoard} ${chatSession.criteriaId.subject} ${chatSession.criteriaId.level} curriculum
- Follow the instructional guidelines and teaching approaches from the educational criteria
- Provide clear, structured explanations (steps, bullet points, equations)
- Keep answers educational and aligned with the curriculum standards

Educational Criteria Guidelines:
${instructionalContext || "Use standard ${chatSession.criteriaId.educationalBoard} ${chatSession.criteriaId.subject} ${chatSession.criteriaId.level} teaching approaches."}`,
        },
        { role: "user", content: message },
      ];

      response = await generateResponse(messages);
    } else {
      console.log("🎓 Generating educational response with criteria guidance");
      const messages = [
        {
          role: "system",
          content: `You are an AI tutor specialized in ${chatSession.criteriaId.educationalBoard} ${chatSession.criteriaId.subject} ${chatSession.criteriaId.level} education.

CRITICAL INSTRUCTIONS:
- Use your knowledge of ${chatSession.criteriaId.educationalBoard} ${chatSession.criteriaId.subject} ${chatSession.criteriaId.level} curriculum
- Follow the instructional guidelines and teaching approaches provided below
- Provide clear, structured explanations (steps, bullet points, equations)
- Keep answers educational and aligned with the curriculum standards
- Use appropriate terminology and concepts for ${chatSession.criteriaId.level} level
- Follow ${chatSession.criteriaId.educationalBoard} assessment criteria and command terms

Educational Criteria Guidelines:
${instructionalContext || "Use standard ${chatSession.criteriaId.educationalBoard} ${chatSession.criteriaId.subject} ${chatSession.criteriaId.level} teaching approaches and curriculum standards."}`,
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
        criteria: chatSession.criteriaId.name,
        responseTime: 0,
      },
    });

    chatSession.messages.push({
      role: "assistant",
      content: response,
      metadata: {
        criteria: chatSession.criteriaId.name,
        tokensUsed: response.length,
        responseTime,
        criteriaUsed: hasRelevantCriteria,
      },
    });

    chatSession.totalTokensUsed += response.length;
    await chatSession.save();

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

// Get chat history
router.get('/session/:sessionId', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;

    const chatSession = await ChatSession.findOne({ sessionId }).populate('knowledgeBaseId');
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({
      success: true,
      session: {
        sessionId: chatSession.sessionId,
        knowledgeBaseId: chatSession.knowledgeBaseId._id,
        knowledgeBaseName: chatSession.knowledgeBaseId.name,
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

// Get all chat sessions
router.get('/sessions', async (req: any, res: any) => {
  try {
    const sessions = await ChatSession.find({})
      .populate('knowledgeBaseId', 'name')
      .select('sessionId knowledgeBaseId messages totalTokensUsed createdAt lastActivity')
      .sort({ lastActivity: -1 })
      .limit(50);

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        sessionId: session.sessionId,
        knowledgeBaseId: session.knowledgeBaseId._id,
        knowledgeBaseName: session.knowledgeBaseId.name,
        messageCount: session.messages.length,
        totalTokensUsed: session.totalTokensUsed,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      }))
    });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

// Delete chat session
router.delete('/session/:sessionId', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;

    const result = await ChatSession.deleteOne({ sessionId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({ success: true, message: 'Chat session deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

export default router;
