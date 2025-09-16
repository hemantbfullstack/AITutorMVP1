import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "your-openai-key",
});

// Tutor self-test endpoint
const tutorSelfTest = async (req: any, res: any) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        status: "error",
        error: "Tutor not configured: add OPENAI_API_KEY in Secrets.",
      });
    }

    const testMessages = [{ role: "user", content: "Say 'ready'" }];

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
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    });
  } catch (error: any) {
    console.error("Tutor self-test error:", error);

    let errorMessage = "Connection failed";
    if (error.status === 401) {
      errorMessage = "OpenAI auth failed or quota exceeded.";
    } else if (error.status === 429) {
      errorMessage = "Rate limit exceeded.";
    } else if (error.code === "insufficient_quota") {
      errorMessage = "OpenAI quota exceeded.";
    }

    res.status(500).json({
      status: "error",
      error: errorMessage,
      details: error.message,
    });
  }
};

// Tutor message with streaming support
const tutorMessage = async (req: any, res: any) => {
  const isNonStreamMode = req.query.mode === "nonstream";

  try {
    const userId = req.user.id;
    const { message, ibSubject, ibLevel, sessionId } = req.body;

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Tutor not configured: add OPENAI_API_KEY in Secrets.",
        code: "MISSING_API_KEY",
      });
    }

    // Find or create session
    let session;
    if (sessionId) {
      const { default: TutorSession } = await import('../models/TutorSession');
      session = await TutorSession.findById(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }
    } else {
      const { default: TutorSession } = await import('../models/TutorSession');
      session = new TutorSession({
        userId,
        ibSubject,
        ibLevel,
        title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
      });
      await session.save();
    }

    // Get conversation history
    const { default: Message } = await import('../models/Message');
    const recentMessages = await Message.find({ sessionId: session._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const conversationHistory = recentMessages.reverse().map((msg: any) => ({
      role: msg.role,
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
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: message },
    ];

    // Store user message
    const userMessage = new Message({
      sessionId: session._id,
      userId,
      role: "user",
      content: message,
    });
    await userMessage.save();

    let assistantResponse = "";

    if (isNonStreamMode) {
      // Non-streaming mode for fallback
      try {
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages,
          max_tokens: 2000,
          temperature: 0.7,
        });

        assistantResponse = completion.choices[0]?.message?.content || "";

        // Store assistant response
        const assistantMessage = new Message({
          sessionId: session._id,
          userId,
          role: "assistant",
          content: assistantResponse,
        });
        await assistantMessage.save();

        res.json({
          response: assistantResponse,
          sessionId: session._id,
          mode: "nonstream",
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
        } else if (error.code === "insufficient_quota") {
          errorMessage = "OpenAI quota exceeded.";
          errorCode = "QUOTA_EXCEEDED";
        }

        return res
          .status(500)
          .json({ error: errorMessage, code: errorCode });
      }
    } else {
      // Streaming mode (default)
      try {
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Transfer-Encoding", "chunked");

        const stream = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages,
          stream: true,
          max_tokens: 2000,
          temperature: 0.7,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            assistantResponse += content;
            res.write(content);
          }
        }

        // Store assistant response
        const assistantMessage = new Message({
          sessionId: session._id,
          userId,
          role: "assistant",
          content: assistantResponse,
        });
        await assistantMessage.save();

        // Send session info
        res.write(`\n\n__SESSION_ID__${session._id}`);
        res.end();
      } catch (error: any) {
        console.error("OpenAI streaming error:", error);

        let errorMessage =
          "Temporary connection issue; trying non-streaming mode.";
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
            retryWithNonStream: true,
          });
        } else {
          res.end();
        }
      }
    }
  } catch (error: any) {
    console.error("Error in tutor message:", error);

    // Handle validation errors specifically
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Invalid request format",
        code: "VALIDATION_ERROR",
        details: error.issues,
      });
    }

    res.status(500).json({
      error: "Failed to process message",
      code: "INTERNAL_ERROR",
    });
  }
};

export {
  tutorSelfTest,
  tutorMessage
};
