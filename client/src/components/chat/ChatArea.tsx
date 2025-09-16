import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/utils/apiClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  detectDrawingIntent,
  createUIAction,
  UIAction,
} from "@/lib/intentDetector";
import { parseGraphQuery, detectGraphIntent } from "@/lib/parseGraphQuery";
import { emitGraphRender } from "@/lib/graphBus";
import { TriangleType } from "@/components/tools/shapes/TriangleDrawer";
import { fetchWolframImage, parsePlotQuery } from "@/utils/wolframClient";
import TutorSelector from "./TutorSelector";
import {
  Play,
  Pause,
  Volume2,
  CheckCircle,
  GraduationCap,
  User,
  Copy,
  Settings,
  Crown,
  AlertCircle,
  BookOpen,
  Database,
  Brain,
  Lightbulb,
  Target,
  Zap,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UsageIndicator } from "./UsageIndicator";
import axios from "axios";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  image?: string; // data URL for inline images
  createdAt: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  totalChunks: number;
  totalTokens: number;
  createdAt: string;
}

interface ChatAreaProps {
  onToggleMobileTools: () => void;
  onTriggerVisual?: (action: UIAction) => void;
}

export default function ChatArea({
  onToggleMobileTools,
  onTriggerVisual,
}: ChatAreaProps) {
  // Existing state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [ibSubject, setIbSubject] = useState<"AA" | "AI">("AA");
  const [ibLevel, setIbLevel] = useState<"HL" | "SL">("HL");
  const [selfTestResult, setSelfTestResult] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("alloy");
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);
  const [volume, setVolume] = useState(0.7);

  // NEW: Knowledge base state
  const [tutorMode, setTutorMode] = useState<"ib" | "knowledge">("ib");
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<string>("");
  const [kbSessionId, setKbSessionId] = useState<string>("");
  const [showKBSelector, setShowKBSelector] = useState(false);
  const [isLoadingKB, setIsLoadingKB] = useState(false);

  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: storeUser } = useAuth();

  // Fetch knowledge bases on component mount
  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  const fetchKnowledgeBases = async () => {
    try {
      const response = await axios.get('/api/knowledge-base');
      setKnowledgeBases(response.data.knowledgeBases);
    } catch (error) {
      console.error('Error fetching knowledge bases:', error);
    }
  };

  // Add usage limit check function locally
  const isUsageLimitReached = () => {
    if (!storeUser || !storeUser.planId) return false;

    const plans = [
      { id: "free", limit: 5 },
      { id: "hourly", limit: 100 },
      { id: "monthly", limit: 200 },
      { id: "annual", limit: 2500 },
    ];

    const plan = plans.find((p) => p.id === storeUser.planId);
    if (!plan || !plan.limit) return false;

    return storeUser.usageCount >= plan.limit;
  };

  // Load voice preference from localStorage
  useEffect(() => {
    const savedVoiceId = localStorage.getItem("selectedVoiceId");
    if (savedVoiceId) {
      const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
      if (validVoices.includes(savedVoiceId)) {
        setSelectedVoiceId(savedVoiceId);
      } else {
        setSelectedVoiceId("alloy");
        localStorage.setItem("selectedVoiceId", "alloy");
      }
    }

    // Load voice control preferences
    const savedAutoPlay = localStorage.getItem('autoPlayVoice');
    if (savedAutoPlay !== null) {
      setAutoPlayVoice(savedAutoPlay === 'true');
    }

    const savedVolume = localStorage.getItem('volume');
    if (savedVolume !== null) {
      setVolume(parseFloat(savedVolume));
    }
  }, []);

  // Save voice preference to localStorage
  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    localStorage.setItem("selectedVoiceId", voiceId);
    setMessages((prev) => [...prev]);
  };

  // Voice control handlers
  const handleAutoPlayChange = (checked: boolean) => {
    setAutoPlayVoice(checked);
    localStorage.setItem('autoPlayVoice', checked.toString());
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    localStorage.setItem('volume', newVolume.toString());
  };

  // Fetch sessions for IB tutor
  const { data: sessions } = useQuery({
    queryKey: ["/api/tutor/sessions"],
    queryFn: async () => {
      const response = await apiClient.get("/tutor/sessions");
      return response.data;
    },
    retry: false,
    enabled: tutorMode === "ib",
  });

  // Load session messages when sessionId changes
  useEffect(() => {
    if (currentSessionId && tutorMode === "ib") {
      fetchSession();
    }
  }, [currentSessionId, tutorMode]);

  const fetchSession = async () => {
    if (!currentSessionId) return;

    try {
      const response = await fetch(`/api/tutor/session/${currentSessionId}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      const data = await response.json();

      if (messages.length === 0) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    }
  };

  // NEW: Handle knowledge base selection
  const handleKBSelection = async (kbId: string) => {
    if (!kbId) return;
    console.log("Selected KB ID:", kbId);
    setIsLoadingKB(true);
    try {
      const response = await axios.post('/api/chat/session', {
        knowledgeBaseId: kbId
      });

      setSelectedKB(kbId);
      setKbSessionId(response.data.session.sessionId);
      setTutorMode("knowledge");
      setMessages([]);
      setCurrentSessionId(null);
      setShowKBSelector(false);

      toast({
        title: "Knowledge Base Selected",
        description: `Now using knowledge base for context-aware responses.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create knowledge base session",
        variant: "destructive",
      });
      console.error('Error creating KB session:', error);
    } finally {
      setIsLoadingKB(false);
    }
  };

  // NEW: Send message to knowledge base
  const sendKnowledgeBaseMessage = async (message: string) => {
    if (!kbSessionId || !message.trim()) return;

    setIsStreaming(true);
    setStreamingMessage(""); // Clear any previous streaming message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await axios.post('/api/chat/message', {
        sessionId: kbSessionId,
        message,
        isVoice: false
      });

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.data.response.content,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('KB message error:', error);
      toast({
        title: "Error",
        description: "Failed to send message to knowledge base",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
      setStreamingMessage(""); // Clear streaming message
    }
  };

  // Check if user has scrolled up manually
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setShouldAutoScroll(isAtBottom);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (shouldAutoScroll && (messages.length > 0 || isStreaming)) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end"
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [messages.length, isStreaming, shouldAutoScroll]);

  // Reset auto-scroll when new messages come in
  useEffect(() => {
    if (messages.length > 0) {
      setShouldAutoScroll(true);
    }
  }, [messages.length]);

  // Listen for sendToChat events from tools
  useEffect(() => {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent<any>;
      if (!detail) return;

      if (detail.kind === "graph") {
        const { expression, range } = detail as {
          expression: string;
          range: [number, number];
        };
        const msg = `Explain the graph of y = ${expression} on [${range[0]}, ${range[1]}] in IB style.`;
        handleSendMessage(msg);
      } else if (detail.kind === "text") {
        handleSendMessage(detail.text);
      } else if (detail.kind === "image") {
        const { text, imageBase64 } = detail as {
          text: string;
          imageBase64: string;
        };
        handleSendMessageWithImage(text, imageBase64);
      }
    };

    window.addEventListener("app:sendToChat", handler as EventListener);
    return () =>
      window.removeEventListener("app:sendToChat", handler as EventListener);
  }, []);

  // Self-test mutation (only for IB mode)
  const selfTest = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/tutor/selftest", {});
      return response.data;
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

  // IB Tutor send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({
      message,
      useNonStream = false,
    }: {
      message: string;
      useNonStream?: boolean;
    }) => {
      const trimmed = message.trim();
      if (!trimmed) {
        throw new Error("Message cannot be empty");
      }

      setIsStreaming(true);
      setStreamingMessage("");

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const url = useNonStream
        ? "/tutor/message?mode=nonstream"
        : "/tutor/message";
      const response = await apiClient.post(url, {
        message: trimmed,
        ibSubject,
        ibLevel,
        sessionId: currentSessionId,
      });

      if (useNonStream) {
        return response.data;
      } else {
        const url = "/api/tutor/message";
        const fetchResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({
            message: trimmed,
            ibSubject,
            ibLevel,
            sessionId: currentSessionId,
          }),
        });

        if (!fetchResponse.ok) {
          const errorData = await fetchResponse.json();
          const errorWithCode = new Error(
            errorData.error || "Failed to send message"
          ) as any;
          errorWithCode.code = errorData.code;
          errorWithCode.retryWithNonStream = errorData.retryWithNonStream;
          throw errorWithCode;
        }

        const reader = fetchResponse.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);

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

        return { content: assistantContent, mode: "stream" };
      }
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingMessage("");
      setIsStreaming(false);

      queryClient.invalidateQueries({ queryKey: ["/api/tutor/sessions"] });
    },
    onError: (error: any) => {
      setIsStreaming(false);
      setStreamingMessage("");

      setMessages((prev) =>
        prev.filter(
          (msg) => msg.role !== "user" || msg.content !== error.originalMessage
        )
      );

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

      if (error.retryWithNonStream && !error.isRetry) {
        toast({
          title: "Retrying",
          description: "Switching to non-streaming mode...",
        });
        setTimeout(() => {
          sendMessage.mutate({
            message: error.originalMessage || "",
            useNonStream: true,
          });
        }, 1000);
      }
    },
  });

  const handleSendMessageWithImage = (message: string, imageBase64: string) => {
    if (!message.trim()) return;

    const imageMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: message,
      image: imageBase64,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, imageMessage]);

    if (tutorMode === "ib") {
      sendMessage.mutate({
        message: `Please explain this graph: ${message}`,
        useNonStream: false,
      });
    }
  };

  const handleSendMessage = async (message: string) => {
    if (isUsageLimitReached()) {
      toast({
        title: "Usage Limit Reached",
        description: "You've reached your question limit. Please upgrade your plan to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) return;

    // Route to appropriate handler based on mode
    if (tutorMode === "knowledge") {
      await sendKnowledgeBaseMessage(message);
      return;
    }

    // IB mode handling (existing logic)
    const plotQuery = parsePlotQuery(message);
    if (plotQuery) {
      try {
        const imageBase64 = await fetchWolframImage(plotQuery);
        const plotMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Rendered graph: ${plotQuery.replace(/^plot\s+/i, "")}`,
          image: imageBase64,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, plotMessage]);

        setTimeout(() => {
          sendMessage.mutate({
            message: `Explain this mathematical graph: ${plotQuery.replace(/^plot\s+/i, "")}`,
            useNonStream: false,
          });
        }, 100);
        return;
      } catch (error: any) {
        console.error("Wolfram image fetch error:", error);
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Couldn't render with Wolfram: ${error?.message || "unknown error"}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }
    }

    if (detectGraphIntent(message)) {
      const graphData = parseGraphQuery(message);
      if (graphData && graphData.functions.length > 0) {
        emitGraphRender({
          functions: graphData.functions,
          xmin: graphData.xmin,
          xmax: graphData.xmax,
        });

        toast({
          title: "Graph Rendered",
          description: `Plotted: ${graphData.functions.join(", ")} on [${graphData.xmin}, ${graphData.xmax}]`,
        });

        const systemNote: Message = {
          id: crypto.randomUUID(),
          role: "system",
          content: `📊 Rendered graph: ${graphData.functions.join(", ")} on [${graphData.xmin}, ${graphData.xmax}]`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, systemNote]);
      }
    }

    const drawingIntent = detectDrawingIntent(message);
    if (drawingIntent && onTriggerVisual) {
      const action = createUIAction(drawingIntent);
      if (action) {
        onTriggerVisual(action);

        if (action.type === "triangle") {
          toast({
            title: "Drawing Triangle",
            description: `Opening ${action.variant || "generic"} triangle in Shapes panel`,
          });
        }
      }
    }

    sendMessage.mutate({ message, useNonStream: false });
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setStreamingMessage("");
    setIsStreaming(false);

    // If in knowledge mode, reset knowledge mode
    if (tutorMode === "knowledge") {
      setTutorMode("ib");
      setSelectedKB("");
      setKbSessionId("");
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    if (sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
    }
  };

  // Get current tutor display info with enhanced styling
  const getCurrentTutorInfo = () => {
    if (tutorMode === "knowledge" && selectedKB) {
      const kb = knowledgeBases.find(k => k.id === selectedKB);
      return {
        title: `Knowledge Base: ${kb?.name || 'Unknown'}`,
        description: kb?.description || 'Context-aware responses from your documents',
        icon: <Database className="w-6 h-6 text-blue-600" />,
        gradient: "from-blue-500 to-purple-600",
        bgColor: "bg-gradient-to-r from-blue-50 to-purple-50",
        borderColor: "border-blue-200"
      };
    }

    return {
      title: "IB Math Tutor",
      description: `Math ${ibSubject} ${ibLevel} - Your personal AI mathematics tutor`,
      icon: <GraduationCap className="w-6 h-6 text-indigo-600" />,
      gradient: "from-indigo-500 to-blue-600",
      bgColor: "bg-gradient-to-r from-indigo-50 to-blue-50",
      borderColor: "border-indigo-200"
    };
  };

  const tutorInfo = getCurrentTutorInfo();

  // Debug: Add console log to check if button click is working
  const handleKBButtonClick = () => {
    console.log("Knowledge Base button clicked, showKBSelector:", showKBSelector);
    setShowKBSelector(true);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Usage Indicator */}
      <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-white px-4 py-2 text-center text-sm font-medium shadow-lg">
        <div className="flex items-center justify-center gap-2">
          <Crown className="w-4 h-4" />
          <span>5 credits remaining</span>
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
      </div>

      {/* Enhanced Chat Header with Gradient */}
      <div className={`${tutorInfo.bgColor} border-b-2 ${tutorInfo.borderColor} px-6 py-6 shadow-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Enhanced Tutor Info Card */}
            <div className={`flex items-center space-x-4 p-4 rounded-2xl ${tutorInfo.bgColor} border-2 ${tutorInfo.borderColor} shadow-md`}>
              <div className={`p-3 rounded-full bg-gradient-to-r ${tutorInfo.gradient} shadow-lg`}>
                {tutorInfo.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  {tutorInfo.title}
                  {tutorMode === "ib" && <Brain className="w-6 h-6 text-indigo-600 animate-pulse" />}
                  {tutorMode === "knowledge" && <Lightbulb className="w-6 h-6 text-blue-600 animate-pulse" />}
                </h1>
                <p className="text-gray-600 font-medium">{tutorInfo.description}</p>
              </div>
            </div>          
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex items-center space-x-3">
             <TutorSelector
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={handleVoiceChange}
            />
            {/* Enhanced Knowledge Base Button */}
            <Button
              variant={tutorMode === "knowledge" ? "default" : "outline"}
              size="sm"
              onClick={handleKBButtonClick}
              className={`text-sm font-medium px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 shadow-md ${
                tutorMode === "knowledge" 
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700" 
                  : "bg-white border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
              }`}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Knowledge Base
              {tutorMode === "knowledge" && <Sparkles className="w-4 h-4 ml-2 animate-pulse" />}
            </Button>

            {/* Enhanced Self-Test Button */}
            {tutorMode === "ib" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => selfTest.mutate()}
                disabled={selfTest.isPending}
                className="text-sm font-medium px-4 py-2 rounded-xl bg-white border-2 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 transition-all duration-300 hover:scale-105 shadow-md"
                data-testid="button-self-test"
              >
                {selfTest.isPending ? (
                  <>
                    <Zap className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Self-Test
                  </>
                )}
              </Button>
            )}

            {selfTestResult && tutorMode === "ib" && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                selfTestResult.includes("✓") 
                  ? "bg-green-100 text-green-700 border border-green-200" 
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}>
                {selfTestResult}
              </div>
            )}

            {/* Enhanced Math Tools Button */}
            <Button
              className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white hover:from-indigo-600 hover:to-blue-700 px-4 py-2 rounded-xl font-medium shadow-lg transition-all duration-300 hover:scale-105"
              onClick={onToggleMobileTools}
              data-testid="button-toggle-tools"
            >
              <Settings className="w-4 h-4 mr-2" />
              Math Tools
            </Button>

            {/* Enhanced New Chat Button */}
            <Button
              variant="outline"
              onClick={handleNewChat}
              className="text-sm font-medium px-4 py-2 rounded-xl bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 hover:scale-105 shadow-md"
              data-testid="button-new-chat"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Knowledge Base Selector Modal */}
      {showKBSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border-4 border-white/20">
            {/* Enhanced Modal Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Select Knowledge Base</h3>
                    <p className="text-blue-100 mt-1">
                      Choose a knowledge base for context-aware tutoring
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKBSelector(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-xl transition-all duration-300 hover:scale-110"
                >
                  <AlertCircle className="w-6 h-6" />
                </Button>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {/* Enhanced IB Mode Option */}
              <div
                className={`p-4 rounded-2xl border-3 cursor-pointer mb-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                  tutorMode === "ib"
                    ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-indigo-300 bg-white hover:bg-indigo-50'
                }`}
                onClick={() => {
                  setTutorMode("ib");
                  setSelectedKB("");
                  setKbSessionId("");
                  setMessages([]);
                  setShowKBSelector(false);
                }}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${tutorMode === "ib" ? "from-indigo-500 to-blue-600" : "from-gray-400 to-gray-500"} text-white shadow-lg`}>
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                      IB Math Tutor
                      {tutorMode === "ib" && <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />}
                    </h4>
                    <p className="text-gray-600 font-medium">General IB Mathematics tutoring with all tools</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">Interactive Tools</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Voice Support</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Real-time Help</span>
                    </div>
                  </div>
                  {tutorMode === "ib" && (
                    <div className="p-2 bg-indigo-500 rounded-full">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Knowledge Bases */}
              {knowledgeBases.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Database className="w-10 h-10 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">No Knowledge Bases Available</h4>
                  <p className="text-gray-500 mb-4">Upload documents to create knowledge bases</p>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 rounded-xl px-6 py-2">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Upload Documents
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {knowledgeBases.map((kb) => (
                    <div
                      key={kb.id}
                      className={`p-4 rounded-2xl border-3 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                        selectedKB === kb.id
                          ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg'
                          : 'border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKBSelection(kb.id);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${selectedKB === kb.id ? "from-blue-500 to-purple-600" : "from-gray-400 to-gray-500"} text-white shadow-lg`}>
                          <Database className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            {kb.name}
                            {selectedKB === kb.id && <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />}
                          </h4>
                          <p className="text-gray-600 font-medium mb-2">{kb.description}</p>
                          <div className="flex items-center gap-4">
                            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                              {kb.totalChunks} chunks
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                              {kb.totalTokens.toLocaleString()} tokens
                            </span>
                            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                              Context-Aware
                            </span>
                          </div>
                        </div>
                        {selectedKB === kb.id && (
                          <div className="p-2 bg-blue-500 rounded-full">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enhanced Modal Footer */}
            <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200">
              <div className="text-center">
                <p className="text-gray-600 mb-4 font-medium">
                  Need more knowledge bases?
                </p>
                <Button
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 rounded-xl px-6 py-2 font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                  onClick={() => setShowKBSelector(false)}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Manage Knowledge Bases
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Header with Tutor Selection */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              {tutorMode === "knowledge" ? (
                <>
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
                    <Database className="w-6 h-6" />
                  </div>
                  Knowledge Base Tutor
                </>
              ) : (
                <>
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl text-white">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  AI Math Tutor
                </>
              )}
               {/* Enhanced IB Settings */}
            {tutorMode === "ib" && (
              <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-md border border-white/20">
                {/* <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">Subject:</span>
                </div>
                <Select
                  value={ibSubject}
                  onValueChange={(value: "AA" | "AI") => setIbSubject(value)}
                >
                  <SelectTrigger className="w-28 bg-white border-indigo-200 focus:border-indigo-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AA">Math AA</SelectItem>
                    <SelectItem value="AI">Math AI</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={ibLevel}
                  onValueChange={(value: "HL" | "SL") => setIbLevel(value)}
                >
                  <SelectTrigger className="w-32 bg-white border-indigo-200 focus:border-indigo-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HL">Higher Level</SelectItem>
                    <SelectItem value="SL">Standard Level</SelectItem>
                  </SelectContent>
                </Select> */}
              </div>
            )}
            </h2>
           

            {/* Voice Controls */}
            <div className="flex items-center space-x-4 bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-md border border-white/20">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-play-voice"
                  checked={autoPlayVoice}
                  onCheckedChange={handleAutoPlayChange}
                  data-testid="checkbox-autoplay"
                />
                <label htmlFor="auto-play-voice" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Auto-play voice
                </label>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Volume2 className="w-4 h-4" />
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-16"
                  data-testid="slider-volume"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Enhanced Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gradient-to-b from-white to-gray-50"
        onScroll={handleScroll}
      >
        {/* Enhanced Welcome Message */}
        {messages.length === 0 && !isStreaming && (
          <div className="flex justify-center">
            <div className="max-w-4xl w-full">
              <MessageBubble
                role="assistant"
                content={
                  tutorMode === "knowledge" && selectedKB
                    ? `Hello! I'm your friendly knowledge base tutor for "${knowledgeBases.find(kb => kb.id === selectedKB)?.name}". I can help you with questions about the uploaded documents, and I'm also happy to chat casually! Feel free to ask me anything about the content, or just say hi! 😊`
                    : `Hello! I'm your IB Mathematics tutor. I can help you with Math ${ibSubject} ${ibLevel} topics. Feel free to ask me any questions about:

• Algebra and functions
• Geometry and trigonometry  
• Statistics and probability
${ibLevel === "HL" ? "• Calculus" : ""}

What would you like to work on today?`
                }
                timestamp={new Date().toISOString()}
                selectedVoiceId={selectedVoiceId}
                autoPlayVoice={autoPlayVoice}
                volume={volume}
              />
            </div>
          </div>
        )}

        {/* Enhanced Session Messages */}
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <MessageBubble
              key={`${index}-${selectedVoiceId}`}
              role={message.role}
              content={message.content}
              image={message.image}
              timestamp={message.createdAt}
              isStreaming={isStreaming && index === messages.length - 1}
              selectedVoiceId={selectedVoiceId}
              autoPlayVoice={autoPlayVoice}
              volume={volume}
            />
          ))}

          {/* Enhanced Streaming Message - Only for IB Math Tutor */}
          {isStreaming && tutorMode === "ib" && (
            <MessageBubble
              role="assistant"
              content={streamingMessage}
              timestamp={new Date().toISOString()}
              isStreaming
              selectedVoiceId={selectedVoiceId}
              autoPlayVoice={autoPlayVoice}
              volume={volume}
            />
          )}

          {/* Enhanced Typing Indicator */}
          {isStreaming && (tutorMode === "knowledge" || !streamingMessage) && (
            <div className="flex items-start space-x-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                tutorMode === "knowledge" 
                  ? "bg-gradient-to-r from-blue-500 to-purple-600" 
                  : "bg-gradient-to-r from-indigo-500 to-blue-600"
              }`}>
                {tutorMode === "knowledge" ? (
                  <Database className="w-5 h-5 text-white animate-pulse" />
                ) : (
                  <Brain className="w-5 h-5 text-white animate-pulse" />
                )}
              </div>
              <div className="bg-white rounded-2xl px-6 py-4 shadow-lg border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    tutorMode === "knowledge" ? "bg-blue-400" : "bg-indigo-400"
                  }`}></div>
                  <div
                    className={`w-2 h-2 rounded-full animate-bounce ${
                      tutorMode === "knowledge" ? "bg-blue-400" : "bg-indigo-400"
                    }`}
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full animate-bounce ${
                      tutorMode === "knowledge" ? "bg-blue-400" : "bg-indigo-400"
                    }`}
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <span className={`text-sm font-medium ml-3 ${
                    tutorMode === "knowledge" ? "text-blue-600" : "text-indigo-600"
                  }`}>
                    {tutorMode === "knowledge" ? "Searching knowledge base..." : "Tutor is thinking..."}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Message Input */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <MessageInput
            onSendMessage={(message) => {
              const trimmed = message.trim();
              if (!trimmed) return;

              handleSendMessage(trimmed);
            }}
            disabled={ isUsageLimitReached()}
            sessionId={tutorMode === "ib" ? currentSessionId : kbSessionId}
          />
        </div>
      </div>
    </div>
  );
}
