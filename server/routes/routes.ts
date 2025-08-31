import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage.js";
import { setupAuth, isAuthenticated } from "../replitAuth.js";
import wolframRouter from "../wolfram.js";
import {
  tutorMessageSchema,
  calcSchema,
  graphSchema,
  wolframSchema,
  ttsSchema,
  generatePaperSchema,
} from "@shared/schema";
import OpenAI from "openai";
import { evaluate } from "mathjs";
import rateLimit from "express-rate-limit";
import { paperGeneratorService } from "../paperGenerator.js";
import stripeRoutes from "../routes/stripe.js";
import adminRoutes from "../routes/admin.js";



const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "your-openai-key",
});

// Rate limiters
const tutorRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 messages per 5 minutes
  message: { error: "Too many messages. Please wait before sending more." },
  standardHeaders: true,
  legacyHeaders: false,
});

const toolsRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: "Too many tool requests. Please wait." },
});

const ttsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 TTS calls per 5 minutes
  message: { error: "Too many TTS requests. Please wait." },
});

const paperGenRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 paper generations per 10 minutes
  message: { error: "Too many paper generation requests. Please wait." },
});

// Helper function to get user ID in both Replit and local environments
function getUserId(req: any): string {
  const isReplitEnvironment = !!(process.env.REPLIT_DOMAINS && process.env.REPL_ID);
  if (!isReplitEnvironment) {
    // Local development - get user ID from session
    return req.user?.id || "anonymous";
  }
  // Replit environment - get user ID from Replit claims
  return req.user.claims.sub;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Wolfram routes
  app.use('/api/wolfram', wolframRouter);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Check if we're running in local development or accessing via localhost
      const isReplitEnvironment = !!(process.env.REPLIT_DOMAINS && process.env.REPL_ID);
      const isLocalAccess = req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.hostname === '0.0.0.0';
      
      if (!isReplitEnvironment) {
        // Local development - return the authenticated user from session
        const user = req.user;
        if (!user) {
          return res.status(401).json({ message: "Not authenticated" });
        }
        
        // Remove password from response and add role if missing
        const { password, ...userWithoutPassword } = user;
        const userWithRole = {
          ...userWithoutPassword,
          role: user.role || 'student' // Ensure role is always present
        };
        
        return res.json(userWithRole);
      }

      // Check if we have a mock Replit development user
      if (req.user && req.user.claims && req.user.claims.sub === "replit-dev-user") {
        // Mock user for development in Replit
        const mockUser = {
          id: "replit-dev-user",
          email: "dev@replit.local",
          firstName: "Replit",
          lastName: "Developer",
          profileImageUrl: null,
          role: "admin", // Add role
          createdAt: new Date(),
          updatedAt: new Date(),
          planId: "free",
          usageCount: 0,
          usageResetAt: null,
          isLocalUser: false
        };
        return res.json(mockUser);
      }

      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Tutor self-test endpoint
  app.post('/api/tutor/selftest', isAuthenticated, async (req: any, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          status: "error", 
          error: "Tutor not configured: add OPENAI_API_KEY in Secrets." 
        });
      }

      const testMessages = [
        { role: "user" as const, content: "Say 'ready'" }
      ];

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: testMessages,
        max_tokens: 10,
        temperature: 0,
      });

      const response = completion.choices[0]?.message?.content || "";
      
      res.json({ 
        status: "ok", 
        text: response.trim(),
        model: process.env.OPENAI_MODEL || "gpt-4o-mini"
      });
      
    } catch (error: any) {
      console.error("Tutor self-test error:", error);
      
      let errorMessage = "Connection failed";
      if (error.status === 401) {
        errorMessage = "OpenAI auth failed or quota exceeded.";
      } else if (error.status === 429) {
        errorMessage = "Rate limit exceeded.";
      } else if (error.code === 'insufficient_quota') {
        errorMessage = "OpenAI quota exceeded.";
      }
      
      res.status(500).json({ 
        status: "error", 
        error: errorMessage,
        details: error.message 
      });
    }
  });

  // Tutor routes
  app.post('/api/tutor/message', isAuthenticated, tutorRateLimit, async (req: any, res) => {
    const isNonStreamMode = req.query.mode === 'nonstream';
    
    try {
      const userId = getUserId(req);
      const { message, ibSubject, ibLevel, sessionId } = tutorMessageSchema.parse(req.body);

      // Validate OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          error: "Tutor not configured: add OPENAI_API_KEY in Secrets.",
          code: "MISSING_API_KEY"
        });
      }

      // Find or create session
      let session;
      if (sessionId) {
        session = await storage.getTutorSession(sessionId);
        if (!session || session.userId !== userId) {
          return res.status(404).json({ error: "Session not found" });
        }
      } else {
        session = await storage.createTutorSession({
          userId,
          ibSubject,
          ibLevel,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        });
      }

      // Get conversation history
      const recentMessages = await storage.getLatestMessages(session.id, 10);
      const conversationHistory = recentMessages.reverse().map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      }));

      // Build system prompt with visual integration
      const systemPrompt = `You are an IB Mathematics Tutor for ${ibSubject} ${ibLevel}. Teach in authentic IB style with command terms, step-by-step reasoning, and clarity.

VISUAL INTEGRATION: When students ask to "draw", "show", or "sketch" diagrams (triangles, graphs, shapes), respond concisely and reference the visual that appears automatically. Do NOT say "I cannot create graphs" or "I cannot draw" - the UI handles visuals. Use phrases like "As shown in the diagram..." or "Looking at the graph above..."

Teaching approach:
- Provide worked examples with step-by-step solutions
- Highlight calculator vs non-calculator approaches
- Point out common IB mistakes and how to avoid them
- Use LaTeX for math expressions: $ for inline or $$ for block equations
- Work WITH the visual tools - explain while they render diagrams/graphs

Mathematical notation: Use proper LaTeX formatting for all expressions.`;

      // Prepare messages for OpenAI
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory,
        { role: "user" as const, content: message },
      ];

      // Store user message
      await storage.createMessage({
        sessionId: session.id,
        userId,
        role: "user",
        content: message,
      });

      let assistantResponse = '';

      if (isNonStreamMode) {
        // Non-streaming mode for fallback
        try {
          const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages,
            max_tokens: 2000,
            temperature: 0.7,
          });

          assistantResponse = completion.choices[0]?.message?.content || '';

          // Store assistant response
          await storage.createMessage({
            sessionId: session.id,
            userId,
            role: "assistant",
            content: assistantResponse,
          });

          res.json({
            response: assistantResponse,
            sessionId: session.id,
            mode: 'nonstream'
          });

        } catch (error: any) {
          console.error("OpenAI non-streaming error:", error);
          
          let errorMessage = "Tutor temporarily unavailable";
          let errorCode = "OPENAI_ERROR";
          
          if (error.status === 401) {
            errorMessage = "OpenAI auth failed or quota exceeded.";
            errorCode = "AUTH_FAILED";
          } else if (error.status === 429) {
            errorMessage = "Rate limit exceeded. Please try again later.";
            errorCode = "RATE_LIMITED";
          } else if (error.code === 'insufficient_quota') {
            errorMessage = "OpenAI quota exceeded.";
            errorCode = "QUOTA_EXCEEDED";
          }
          
          return res.status(500).json({ error: errorMessage, code: errorCode });
        }
      } else {
        // Streaming mode (default)
        try {
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('Transfer-Encoding', 'chunked');

          const stream = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages,
            stream: true,
            max_tokens: 2000,
            temperature: 0.7,
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              assistantResponse += content;
              res.write(content);
            }
          }

          // Store assistant response
          await storage.createMessage({
            sessionId: session.id,
            userId,
            role: "assistant",
            content: assistantResponse,
          });

          // Send session info
          res.write(`\n\n__SESSION_ID__${session.id}`);
          res.end();

        } catch (error: any) {
          console.error("OpenAI streaming error:", error);
          
          let errorMessage = "Temporary connection issue; trying non-streaming mode.";
          let errorCode = "STREAM_FAILED";
          
          if (error.status === 401) {
            errorMessage = "OpenAI auth failed or quota exceeded.";
            errorCode = "AUTH_FAILED";
          } else if (error.status === 429) {
            errorMessage = "Rate limit exceeded.";
            errorCode = "RATE_LIMITED";
          }
          
          // If headers aren't sent yet, return JSON error for client to retry
          if (!res.headersSent) {
            return res.status(500).json({ 
              error: errorMessage,
              code: errorCode,
              retryWithNonStream: true 
            });
          } else {
            res.end();
          }
        }
      }

    } catch (error: any) {
      console.error("Error in tutor message:", error);
      
      // Handle validation errors specifically
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid request format",
          code: "VALIDATION_ERROR",
          details: error.issues 
        });
      }
      
      res.status(500).json({ 
        error: "Failed to process message",
        code: "INTERNAL_ERROR"
      });
    }
  });

  app.get('/api/tutor/session/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const session = await storage.getTutorSession(req.params.id);
      
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      const messages = await storage.getMessagesBySession(session.id);
      
      res.json({
        session,
        messages: messages.reverse(),
      });
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.get('/api/tutor/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const sessions = await storage.getTutorSessionsByUser(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Math Tools routes
  app.post('/api/tools/calc', isAuthenticated, toolsRateLimit, async (req, res) => {
    try {
      const { expression } = calcSchema.parse(req.body);
      
      // Use mathjs for safe evaluation
      const result = evaluate(expression);
      
      res.json({ result: result.toString() });
    } catch (error) {
      console.error("Calculator error:", error);
      res.status(400).json({ error: "Invalid expression" });
    }
  });

  app.post('/api/tools/graph', isAuthenticated, toolsRateLimit, async (req, res) => {
    try {
      const { functions, xRange, yRange } = graphSchema.parse(req.body);
      
      // Validate functions using mathjs
      const validatedFunctions = [];
      for (const func of functions) {
        try {
          // Test the function with a sample value
          const testExpr = func.replace(/x/g, '1');
          evaluate(testExpr);
          validatedFunctions.push(func);
        } catch (error) {
          console.warn(`Invalid function: ${func}`);
        }
      }

      if (validatedFunctions.length === 0) {
        return res.status(400).json({ error: "No valid functions provided" });
      }

      // Generate plot data points
      const plotData = validatedFunctions.map((func, index) => {
        const xMin = xRange?.min ?? -10;
        const xMax = xRange?.max ?? 10;
        const points = 200;
        const step = (xMax - xMin) / points;
        
        const xData = [];
        const yData = [];
        
        for (let i = 0; i <= points; i++) {
          const x = xMin + i * step;
          try {
            const expr = func.replace(/x/g, x.toString());
            const y = evaluate(expr);
            if (typeof y === 'number' && isFinite(y)) {
              xData.push(x);
              yData.push(y);
            }
          } catch (error) {
            // Skip invalid points
          }
        }
        
        return {
          function: func,
          xData,
          yData,
          color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
        };
      });

      res.json({ plotData, xRange, yRange });
    } catch (error) {
      console.error("Graph error:", error);
      res.status(400).json({ error: "Invalid graph request" });
    }
  });

  app.post('/api/tools/wolfram', isAuthenticated, toolsRateLimit, async (req, res) => {
    try {
      const { query } = wolframSchema.parse(req.body);
      
      const wolframAppId = process.env.WOLFRAM_APP_ID;
      if (!wolframAppId) {
        return res.status(501).json({ error: "Wolfram not configured" });
      }

      // Call Wolfram Alpha API
      const url = `http://api.wolframalpha.com/v2/query?input=${encodeURIComponent(query)}&format=plaintext&output=JSON&appid=${wolframAppId}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Wolfram API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse results
      const results = [];
      if (data.queryresult?.pods) {
        for (const pod of data.queryresult.pods) {
          if (pod.subpods) {
            for (const subpod of pod.subpods) {
              if (subpod.plaintext) {
                results.push({
                  title: pod.title,
                  plaintext: subpod.plaintext,
                  image: subpod.img?.src,
                });
              }
            }
          }
        }
      }

      res.json({ results, success: results.length > 0 });
    } catch (error) {
      console.error("Wolfram error:", error);
      res.status(500).json({ error: "Failed to query Wolfram Alpha" });
    }
  });

  // TTS routes
  app.post('/api/voice/tts', isAuthenticated, ttsRateLimit, async (req, res) => {
    try {
      const { text, voiceId, model, format } = ttsSchema.parse(req.body);
      
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenLabsApiKey) {
        return res.status(501).json({ error: "TTS not configured" });
      }

      // Use the provided voiceId or fall back to default
      const selectedVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
      const defaultModel = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: model || defaultModel,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
          // Add optimization flags
          output_format: "mp3_44100_128", // Optimized format
          latency_optimization_level: 3, // Maximum latency optimization
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      // Stream the response directly for better performance
      res.setHeader('Content-Type', 'audio/mpeg');
      response.body.pipe(res);
      
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "TTS temporarily unavailable" });
    }
  });

  // Paper Generation Routes
  app.post('/api/papers/generate', isAuthenticated, paperGenRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subject, level, paperType, numQuestions, topics, calcAllowed } = generatePaperSchema.parse(req.body);

      // For now, skip freemium check - implement later when user management is expanded
      // if (userPlan === 'FREE') {
      //   return res.status(402).json({ error: "Premium required for paper generation" });
      // }

      const actualCalcAllowed = calcAllowed !== undefined ? calcAllowed : paperType === "P2";
      
      console.log(`Generating ${subject} ${level} Paper ${paperType.slice(1)} with ${numQuestions} questions`);
      
      const paperData = await paperGeneratorService.generatePaper(
        subject,
        level, 
        paperType,
        numQuestions,
        topics
      );

      const totalMarks = paperGeneratorService.calculateTotalMarks(paperData.questions);

      const generatedPaper = await storage.createGeneratedPaper({
        userId,
        subject,
        level,
        paperType,
        topics: topics || [],
        questionsJson: paperData.questions,
        markschemeJson: paperData.markscheme,
        totalMarks,
      });

      res.json({ paperId: generatedPaper.id });
      
    } catch (error) {
      console.error("Paper generation error:", error);
      if (error instanceof Error && error.message.includes("Paper generation failed")) {
        res.status(500).json({ error: "Failed to generate paper. Please try again." });
      } else {
        res.status(400).json({ error: "Invalid request parameters" });
      }
    }
  });

  app.get('/api/papers/:paperId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { paperId } = req.params;

      const paper = await storage.getGeneratedPaper(paperId);
      
      if (!paper) {
        return res.status(404).json({ error: "Paper not found" });
      }

      if (paper.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(paper);
      
    } catch (error) {
      console.error("Error fetching paper:", error);
      res.status(500).json({ error: "Failed to fetch paper" });
    }
  });

  app.get('/api/papers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const papers = await storage.getGeneratedPapersByUser(userId);
      res.json(papers);
      
    } catch (error) {
      console.error("Error fetching user papers:", error);
      res.status(500).json({ error: "Failed to fetch papers" });
    }
  });

  app.post('/api/papers/:paperId/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { paperId } = req.params;
      const { type } = req.body; // "paper" | "markscheme"

      const paper = await storage.getGeneratedPaper(paperId);
      
      if (!paper) {
        return res.status(404).json({ error: "Paper not found" });
      }

      if (paper.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const paperData = {
        questions: paper.questionsJson as any[],
        markscheme: paper.markschemeJson as any[]
      };

      let pdfBuffer: Buffer;
      let filename: string;

      if (type === "markscheme") {
        pdfBuffer = await paperGeneratorService.generateMarkschemePDF(
          paperData,
          paper.subject as "AA" | "AI",
          paper.level as "HL" | "SL",
          paper.paperType as "P1" | "P2"
        );
        filename = `${paper.subject}_${paper.level}_${paper.paperType}_Markscheme.pdf`;
      } else {
        pdfBuffer = await paperGeneratorService.generatePaperPDF(
          paperData,
          paper.subject as "AA" | "AI",
          paper.level as "HL" | "SL",
          paper.paperType as "P1" | "P2"
        );
        filename = `${paper.subject}_${paper.level}_${paper.paperType}_Paper.pdf`;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Stripe routes
  app.use('/api/stripe', stripeRoutes);
  app.use('/api/admin', adminRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
