import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import KnowledgeBase from '../models/KnowledgeBase.js';
import ChatSession from '../models/ChatSession.js';
import { generateEmbedding, generateResponse } from '../config/openai.js';
import { getIndex } from '../config/pinecone.js';

const router = express.Router();

// Create new chat session
router.post('/session', async (req: any, res: any) => {
  try {
    const { knowledgeBaseId } = req.body;

    if (!knowledgeBaseId) {
      return res.status(400).json({ error: 'Knowledge base ID is required' });
    }

    // Verify knowledge base exists
    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId);
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    const sessionId = uuidv4();
    const chatSession = new ChatSession({
      sessionId,
      knowledgeBaseId,
      messages: []
    });

    await chatSession.save();

    res.json({
      success: true,
      session: {
        sessionId,
        knowledgeBaseId,
        knowledgeBaseName: knowledgeBase.name,
        createdAt: chatSession.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

router.post("/message", async (req: any, res: any) => {
  try {
    const { sessionId, message, isVoice = false } = req.body;

    if (!sessionId || !message) {
      return res
        .status(400)
        .json({ error: "Session ID and message are required" });
    }

    // Get chat session
    const chatSession = await ChatSession.findOne({ sessionId }).populate(
      "knowledgeBaseId"
    );
    if (!chatSession) {
      return res.status(404).json({ error: "Chat session not found" });
    }

    console.log(
      "🔍 Searching for knowledge base:",
      chatSession.knowledgeBaseId._id.toString()
    );
    console.log("📝 User message:", message);

    const startTime = Date.now();

    // Generate embedding for user message
    const queryEmbedding = await generateEmbedding(message);
    console.log("🧮 Embedding length:", queryEmbedding.length);

    // Query Pinecone
    let searchResponse: any = { matches: [] };
    let pineconeAvailable = false;

    try {
      const index = getIndex();
      console.log("🌲 Pinecone index:", index);
      if (index && typeof index.query === "function") {
        searchResponse = await index.query({
          vector: queryEmbedding,
          topK: 10,
          includeMetadata: true,
          filter: {
            knowledgeBaseId: chatSession.knowledgeBaseId._id.toString(),
          },
        });

        pineconeAvailable = true;
        console.log(
          "🔍 Pinecone search found",
          searchResponse.matches?.length || 0,
          "matches"
        );
      }
    } catch (err) {
      console.warn("⚠️ Pinecone search failed:", err);
    }

    // Check search results
    console.log(
      "🔍 Matches found:",
      searchResponse.matches?.length || 0
    );
    if (searchResponse.matches?.length > 0) {
      console.log(
        "📊 Scores:",
        searchResponse.matches.map((m: any) => m.score)
      );
      console.log("📄 First match metadata:", searchResponse.matches[0].metadata);
    }

    // Build context from matches
    let context = "";
    let hasRelevantContext = false;

    if (searchResponse.matches && searchResponse.matches.length > 0) {
      const relevantMatches = searchResponse.matches.filter(
        (m: any) => m.score > 0.05 // very low threshold to catch any matches
      );

      console.log("✅ Relevant matches:", relevantMatches.length);

      if (relevantMatches.length > 0) {
        context = relevantMatches
          .map((m: any) => m.metadata?.text || "")
          .join("\n\n");
        hasRelevantContext = true;
        console.log("📚 Context length:", context.length);
        console.log("📄 Full context:", context);
        console.log("📄 Context preview:", context.substring(0, 200) + "...");
      } else {
        console.log("❌ No matches above threshold 0.05");
        console.log("📊 All scores:", searchResponse.matches.map((m: any) => m.score));
      }
    }

    // Generate response
    let response: string;
    
    // Check if this is a casual conversation (greetings, how are you, etc.)
    const isCasualConversation = /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|how's it going|what's up|thanks|thank you|bye|goodbye|see you|nice to meet you|pleasure|how do you do|good to see you|great to meet you|howdy|sup|what's happening|how's your day|how's everything|what's new|how's life)/i.test(message.trim());
    
    if (isCasualConversation) {
      console.log("💬 Handling casual conversation");
      const messages = [
        {
          role: "system",
          content: `You are a friendly AI tutor specialized in the knowledge base "${chatSession.knowledgeBaseId.name}". 

You can handle both casual conversation and knowledge-based questions:

FOR CASUAL CONVERSATION (greetings, how are you, etc.):
- Be warm, friendly, and conversational
- Keep responses brief and natural
- Mention that you're ready to help with questions about the knowledge base
- Examples: "Hi! I'm doing great, thank you! I'm here to help you with any questions about ${chatSession.knowledgeBaseId.name}. What would you like to know?"

FOR KNOWLEDGE QUESTIONS:
- ONLY use information from the provided "Context from knowledge base"
- If no relevant context is found, say: "I don't have specific information about that in my knowledge base, but I'd be happy to help with questions about ${chatSession.knowledgeBaseId.name}."
- Use clear, structured explanations (steps, bullet points, equations)
- Keep answers concise but educational

Context from knowledge base:
${context}`,
        },
        { role: "user", content: message },
      ];

      response = await generateResponse(messages);
    } else if (!hasRelevantContext || context.length === 0) {
      console.log("❌ No relevant context found for knowledge question");
      if (!pineconeAvailable) {
        response =
          "Sorry, I don't have this information in my knowledge base. Vector search is currently unavailable (Pinecone not configured). However, I'm happy to chat about other topics or help with questions about the available content.";
      } else {
        response =
          `I don't have specific information about that in my knowledge base "${chatSession.knowledgeBaseId.name}". However, I'm happy to help with questions about the content that is available, or we can have a casual conversation!`;
      }
    } else {
      console.log("✅ Generating response with context");
      const messages = [
        {
          role: "system",
          content: `You are an AI tutor specialized in the knowledge base "${chatSession.knowledgeBaseId.name}". 
             
          CRITICAL INSTRUCTIONS:
          - ONLY answer using the provided "Context from knowledge base".
          - If context does not cover it, reply: 
            "I don't have specific information about that in my knowledge base, but I'd be happy to help with questions about ${chatSession.knowledgeBaseId.name}."
          - Use clear, structured explanations (steps, bullet points, equations).
          - Keep answers concise but educational.
          
          Context from knowledge base:
          ${context}`,
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
        knowledgeBase: chatSession.knowledgeBaseId.name,
        responseTime: 0,
      },
    });

    chatSession.messages.push({
      role: "assistant",
      content: response,
      metadata: {
        knowledgeBase: chatSession.knowledgeBaseId.name,
        tokensUsed: response.length,
        responseTime,
        contextUsed: hasRelevantContext,
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
        contextUsed: hasRelevantContext,
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
