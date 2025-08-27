import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { detectDrawingIntent, createUIAction, UIAction } from "@/lib/intentDetector";
import { parseGraphQuery, detectGraphIntent } from "@/lib/parseGraphQuery";
import { emitGraphRender } from "@/lib/graphBus";
import { TriangleType } from "@/components/tools/shapes/TriangleDrawer";
import { fetchWolframImage, parsePlotQuery } from "@/utils/wolframClient";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  image?: string; // data URL for inline images
  createdAt: string;
}

interface ChatAreaProps {
  onToggleMobileTools: () => void;
  onTriggerVisual?: (action: UIAction) => void;
}

export default function ChatArea({ onToggleMobileTools, onTriggerVisual }: ChatAreaProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [ibSubject, setIbSubject] = useState<"AA" | "AI">("AA");
  const [ibLevel, setIbLevel] = useState<"HL" | "SL">("HL");
  const [selfTestResult, setSelfTestResult] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch sessions
  const { data: sessions } = useQuery({
    queryKey: ["/api/tutor/sessions"],
    retry: false,
  });

  // Load session messages when sessionId changes
  useEffect(() => {
    if (currentSessionId) {
      fetchSession();
    }
  }, [currentSessionId]);

  const fetchSession = async () => {
    if (!currentSessionId) return;

    try {
      const response = await apiRequest("GET", `/api/tutor/session/${currentSessionId}`);
      const data = await response.json();
      
      // Only update messages if we don't have any current messages
      // This prevents overwriting user messages that haven't been sent yet
      if (messages.length === 0) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Debug logging for message changes
  useEffect(() => {
    console.log("Messages state updated:", messages.length, "messages");
    console.log("Current session ID:", currentSessionId);
  }, [messages, currentSessionId]);

  // Listen for sendToChat events from tools
  useEffect(() => {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent<any>;
      if (!detail) return;

      if (detail.kind === "graph") {
        const { expression, range } = detail as { expression: string; range: [number, number] };
        const msg = `Explain the graph of y = ${expression} on [${range[0]}, ${range[1]}] in IB style.`;
        handleSendMessage(msg);
      } else if (detail.kind === "text") {
        handleSendMessage(detail.text);
      } else if (detail.kind === "image") {
        const { text, imageBase64 } = detail as { text: string; imageBase64: string };
        handleSendMessageWithImage(text, imageBase64);
      }
    };

    window.addEventListener("app:sendToChat", handler as EventListener);
    return () => window.removeEventListener("app:sendToChat", handler as EventListener);
  }, []);

  // Self-test mutation
  const selfTest = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/tutor/selftest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Self-test failed");
      }

      return await response.json();
    },
    onSuccess: (data: any) => {
      setSelfTestResult(`✓ PASS: ${data.text} (${data.model})`);
      toast({
        title: "Self-Test Passed",
        description: `Tutor is ready: ${data.text}`,
      });
    },
    onError: (error: any) => {
      setSelfTestResult(`✗ FAIL: ${error.message}`);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Self-Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({ message, useNonStream = false }: { message: string; useNonStream?: boolean }) => {
      // Validate input
      const trimmed = message.trim();
      if (!trimmed) {
        throw new Error("Message cannot be empty");
      }

      setIsStreaming(true);
      setStreamingMessage("");

      // Add user message immediately to ensure it's visible
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);

      const url = useNonStream ? "/api/tutor/message?mode=nonstream" : "/api/tutor/message";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: trimmed,
          ibSubject,
          ibLevel,
          sessionId: currentSessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorWithCode = new Error(errorData.error || "Failed to send message") as any;
        errorWithCode.code = errorData.code;
        errorWithCode.retryWithNonStream = errorData.retryWithNonStream;
        throw errorWithCode;
      }

      if (useNonStream) {
        // Handle non-streaming response
        const data = await response.json();
        setCurrentSessionId(data.sessionId);
        return { content: data.response, mode: data.mode };
      } else {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);

            // Check for session ID
            if (chunk.includes("__SESSION_ID__")) {
              const sessionIdMatch = chunk.match(/__SESSION_ID__(.+)/);
              if (sessionIdMatch) {
                setCurrentSessionId(sessionIdMatch[1]);
              }
            } else {
              assistantContent += chunk;
              setStreamingMessage(assistantContent);
            }
          }
        }

        return { content: assistantContent, mode: 'stream' };
      }
    },
    onSuccess: (data) => {
      // Add assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setStreamingMessage("");
      setIsStreaming(false);

      // Refresh sessions list
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/sessions"] });
    },
    onError: (error: any) => {
      setIsStreaming(false);
      setStreamingMessage("");

      // Remove the user message if there was an error
      setMessages(prev => prev.filter(msg => msg.role !== "user" || msg.content !== error.originalMessage));

      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      // Handle specific error codes with better messages
      let errorTitle = "Error";
      let errorDescription = error.message;

      switch (error.code) {
        case "MISSING_API_KEY":
          errorTitle = "Configuration Error";
          errorDescription = "Tutor not configured: add OPENAI_API_KEY in Secrets.";
          break;
        case "AUTH_FAILED":
          errorTitle = "OpenAI Error";
          errorDescription = "OpenAI auth failed or quota exceeded.";
          break;
        case "RATE_LIMITED":
          errorTitle = "Rate Limited";
          errorDescription = "Too many requests. Please wait and try again.";
          break;
        case "QUOTA_EXCEEDED":
          errorTitle = "Quota Exceeded";
          errorDescription = "OpenAI quota exceeded.";
          break;
        case "STREAM_FAILED":
          errorTitle = "Connection Issue";
          errorDescription = "Temporary connection issue; trying non-streaming mode.";
          break;
        case "VALIDATION_ERROR":
          errorTitle = "Invalid Input";
          errorDescription = "Please check your message format.";
          break;
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });

      // Auto-retry with non-streaming if server suggests it
      if (error.retryWithNonStream && !error.isRetry) {
        toast({
          title: "Retrying",
          description: "Switching to non-streaming mode...",
        });
        setTimeout(() => {
          sendMessage.mutate({
            message: error.originalMessage || "",
            useNonStream: true
          });
        }, 1000);
      }
    },
  });

  const handleSendMessageWithImage = (message: string, imageBase64: string) => {
    if (!message.trim()) return;

    // Add message with image to chat
    const imageMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: message,
      image: imageBase64,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, imageMessage]);

    // Also send the message content to the AI tutor for explanation
    sendMessage.mutate({ message: `Please explain this graph: ${message}`, useNonStream: false });
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Check for plot commands and render inline image
    const plotQuery = parsePlotQuery(message);
    console.log("handleSendMessage plotQuery check:", { message, plotQuery });
    if (plotQuery) {
      try {
        console.log("Fetching Wolfram image for:", plotQuery);
        const imageBase64 = await fetchWolframImage(plotQuery);
        console.log("Got image data:", imageBase64.substring(0, 50) + "...");
        const plotMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Rendered graph: ${plotQuery.replace(/^plot\s+/i, "")}`,
          image: imageBase64,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, plotMessage]);
        console.log("Added plot message to chat");

        // Send to AI for explanation after a small delay to ensure plot message is rendered
        setTimeout(() => {
          sendMessage.mutate({
            message: `Explain this mathematical graph: ${plotQuery.replace(/^plot\s+/i, "")}`,
            useNonStream: false
          });
        }, 100);
        return; // Don't continue with normal message flow
      } catch (error: any) {
        console.error("Wolfram image fetch error:", error);
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Couldn't render with Wolfram: ${error?.message || "unknown error"}`,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
        return; // Don't continue with normal message flow
      }
    }

    // First check for graph plotting intent
    if (detectGraphIntent(message)) {
      const graphData = parseGraphQuery(message);
      if (graphData && graphData.functions.length > 0) {
        // Emit graph render event for real-time plotting
        emitGraphRender({
          functions: graphData.functions,
          xmin: graphData.xmin,
          xmax: graphData.xmax
        });

        // Show notification that graph was rendered
        toast({
          title: "Graph Rendered",
          description: `Plotted: ${graphData.functions.join(", ")} on [${graphData.xmin}, ${graphData.xmax}]`,
        });

        // Add system note to chat
        const systemNote: Message = {
          id: crypto.randomUUID(),
          role: "system",
          content: `📊 Rendered graph: ${graphData.functions.join(", ")} on [${graphData.xmin}, ${graphData.xmax}]`,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, systemNote]);
      }
    }

    // Check for drawing/visual intent (triangles, shapes)
    const drawingIntent = detectDrawingIntent(message);
    if (drawingIntent && onTriggerVisual) {
      const action = createUIAction(drawingIntent);
      if (action) {
        onTriggerVisual(action);

        // Show toast notification
        if (action.type === "triangle") {
          toast({
            title: "Drawing Triangle",
            description: `Opening ${action.variant || 'generic'} triangle in Shapes panel`,
          });
        }
      }
    }

    // Send message to tutor - this will handle adding the user message
    sendMessage.mutate({ message, useNonStream: false });
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setStreamingMessage("");
    setIsStreaming(false);
  };

  const handleSessionSelect = (sessionId: string) => {
    // Only change session if it's different from current
    if (sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
      // Don't clear messages here - let fetchSession handle it
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <i className="fas fa-robot text-primary text-lg"></i>
            <h1 className="text-lg font-semibold text-slate-900">IB Math Tutor</h1>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Select value={ibSubject} onValueChange={(value: "AA" | "AI") => setIbSubject(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AA">Math AA</SelectItem>
                <SelectItem value="AI">Math AI</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ibLevel} onValueChange={(value: "HL" | "SL") => setIbLevel(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HL">Higher Level</SelectItem>
                <SelectItem value="SL">Standard Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => selfTest.mutate()}
            disabled={selfTest.isPending}
            className="text-xs"
            data-testid="button-self-test"
          >
            {selfTest.isPending ? "Testing..." : "Self-Test"}
          </Button>
          {selfTestResult && (
            <span className={`text-xs ${selfTestResult.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
              {selfTestResult}
            </span>
          )}
          <Button
            className="lg:hidden bg-primary text-white"
            onClick={onToggleMobileTools}
            data-testid="button-toggle-tools"
          >
            <i className="fas fa-calculator mr-1"></i> Tools
          </Button>
          <Button
            variant="outline"
            onClick={handleNewChat}
            data-testid="button-new-chat"
          >
            <i className="fas fa-plus mr-1"></i> New Chat
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Welcome Message */}
        {messages.length === 0 && !isStreaming && (
          <MessageBubble
            role="assistant"
            content={`Hello! I'm your IB Mathematics tutor. I can help you with Math ${ibSubject} ${ibLevel} topics. Feel free to ask me any questions about:

• Algebra and functions
• Geometry and trigonometry  
• Statistics and probability
${ibLevel === "HL" ? "• Calculus" : ""}

What would you like to work on today?`}
            timestamp={new Date().toISOString()}
          />
        )}

        {/* Session Messages */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            content={message.content}
            image={message.image}
            timestamp={message.createdAt}
          />
        ))}

        {/* Streaming Message */}
        {isStreaming && (
          <MessageBubble
            role="assistant"
            content={streamingMessage}
            timestamp={new Date().toISOString()}
            isStreaming
          />
        )}

        {/* Typing Indicator */}
        {isStreaming && !streamingMessage && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <i className="fas fa-robot text-white text-sm"></i>
            </div>
            <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-slate-200">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-slate-500 text-sm ml-2">Tutor is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={(message) => {
          const trimmed = message.trim();
          if (!trimmed) return;

          handleSendMessage(trimmed);
        }}
        disabled={sendMessage.isPending || isStreaming}
        sessionId={currentSessionId}
      />
    </div>
  );
}
