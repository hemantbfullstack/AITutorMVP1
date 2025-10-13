import { useState, useRef, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/utils/apiClient";
import MessageBubble from "./MessageBubble";
import ChatRoomSelector from "./ChatRoomSelector";
import ModernSidebar from "./ModernSidebar";
import TutorHeader from "../layout/TutorHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UIAction } from "@/lib/intentDetector";
import {
  fetchWolframImage,
  parsePlotQuery,
  processImageWithWolfram,
  detectVisualRequest,
  generateWolframQuery,
} from "@/utils/wolframClient";
import TutorSelector from "./TutorSelector";
import {
  Volume2,
  GraduationCap,
  Settings,
  Crown,
  BookOpen,
  Database,
  Lightbulb,
  Sparkles,
  MessageSquare,
  Menu,
  X,
  ArrowDown,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isUsageLimitReached, getRemainingCredits } from "@/constants/plans";
import { useChatRooms, useChatRoom } from "@/hooks/useChatRooms";
import { chatApi } from "@/services/chatApi";
import { ChatRoom, Message as ChatMessage } from "@/types/chat";
import MessageInput from "./MessageInput";

// Legacy Message interface for backward compatibility
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  image?: string; // data URL for inline images
  wolframImage?: string; // Wolfram-generated image
  wolframInterpretation?: string; // Wolfram's interpretation of the image
  wolframGenerated?: boolean; // Flag to indicate Wolfram-generated content
  createdAt: string;
}

interface EducationalCriteria {
  id: string;
  name: string;
  description: string;
  educationalBoard: string;
  subject: string;
  level: string;
  totalChunks: number;
  totalTokens: number;
  createdAt: string;
}

interface ChatAreaProps {
  onToggleMobileTools: () => void;
  onTriggerVisual?: (action: UIAction) => void;
}

export default function ChatAreaEnhanced({
  onToggleMobileTools,
  onTriggerVisual,
}: ChatAreaProps) {
  // Chat Room State
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Legacy state for backward compatibility
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("alloy");
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);
  const [volume, setVolume] = useState(0.7);

  // Knowledge Base state
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [availableLevels, setAvailableLevels] = useState<any[]>([]);
  const [criteriaSessionId, setCriteriaSessionId] = useState<string>("");
  const [showTutorSelector, setShowTutorSelector] = useState(false);
  const [showCriteriaSelector, setShowCriteriaSelector] = useState(false);
  const [isLoadingKnowledgeBase, setIsLoadingKnowledgeBase] = useState(false);
  const [isFetchingKnowledgeBases, setIsFetchingKnowledgeBases] = useState(false);
  const [showTutorLanding, setShowTutorLanding] = useState(false);
  const [selectionStep, setSelectionStep] = useState<'knowledgeBase' | 'level'>('knowledgeBase');

  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const { user: storeUser, refreshUser } = useAuth();

  // Use chat room hooks
  const { rooms, loading: roomsLoading, createRoom } = useChatRooms();
  const {
    room: currentRoom,
    messages: roomMessages,
    loading: roomLoading,
    loadingMore,
    hasMore,
    loadMoreMessages,
    addMessage,
    updateMessage,
    removeMessage,
  } = useChatRoom(selectedRoomId);

  // Convert ChatMessage to legacy Message format for compatibility
  const convertToLegacyMessage = (chatMessage: ChatMessage): Message => ({
    id: chatMessage._id,
    role: chatMessage.role,
    content: chatMessage.content,
    image: chatMessage.image?.data,
    wolframImage: chatMessage.wolframImage,
    wolframInterpretation: chatMessage.wolframInterpretation,
    wolframGenerated: chatMessage.wolframGenerated,
    createdAt: chatMessage.createdAt,
  });

  // Get current messages (either from room or legacy) - using useMemo to avoid dependency issues
  const currentMessages = useMemo(() => {
    return selectedRoomId && roomMessages.length > 0
      ? roomMessages.map(convertToLegacyMessage)
      : messages;
  }, [selectedRoomId, roomMessages, messages, convertToLegacyMessage]);

  // Load the last active chat room
  const loadLastChat = async () => {
    try {
      if (rooms.length > 0) {
        // Find the most recently active room
        const activeRooms = rooms.filter((room) => room.isActive);

        const lastRoom = activeRooms.sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() -
            new Date(a.lastMessageAt).getTime()
        )[0];

        if (lastRoom) {
          setSelectedRoomId(lastRoom.roomId);
          setShowTutorLanding(false);

          // If it's an educational criteria room, set the level and session ID
          if (lastRoom.type === "educational-criteria" && lastRoom.criteriaId) {
            setSelectedLevel(lastRoom.criteriaId);
            if (lastRoom.sessionId) {
              setCriteriaSessionId(lastRoom.sessionId);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading last chat:", error);
    }
  };

  // Fetch knowledge bases on component mount
  useEffect(() => {
    fetchKnowledgeBases();
  }, []);


  // Load last chat when rooms are loaded (only if not showing tutor landing)
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId && !showTutorLanding) {
      loadLastChat();
    }
  }, [rooms, selectedRoomId, showTutorLanding]);

  // Persist selected room ID in localStorage
  useEffect(() => {
    if (selectedRoomId) {
      localStorage.setItem("selectedRoomId", selectedRoomId);
    }
  }, [selectedRoomId]);

  // Load selected room ID from localStorage on mount (only if not showing tutor landing)
  useEffect(() => {
    const savedRoomId = localStorage.getItem("selectedRoomId");
    if (savedRoomId && rooms.length > 0 && !showTutorLanding) {
      const roomExists = rooms.find((room) => room.roomId === savedRoomId);
      if (roomExists) {
        setSelectedRoomId(savedRoomId);
        setShowTutorLanding(false);

        // If it's an educational criteria room, set the level
        if (
          roomExists.type === "educational-criteria" &&
          roomExists.criteriaId
        ) {
          setSelectedLevel(roomExists.criteriaId);
        }
      }
    }
  }, [rooms, showTutorLanding]);

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        // lg breakpoint
        setShowSidebar(false);
        setIsSidebarCollapsed(false);
      } else {
        setShowSidebar(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchKnowledgeBases = async () => {
    try {
      setIsFetchingKnowledgeBases(true);
      
      const response = await apiClient.get("/knowledge-base");
      if (response.data.success) {
        setKnowledgeBases(response.data.criteria);
      }
    } catch (error) {
      console.error("Error fetching knowledge bases:", error);
    } finally {
      setIsFetchingKnowledgeBases(false);
    }
  };

  // Check usage limit
  const checkUsageLimit = () => {
    if (!storeUser || !storeUser.planId || storeUser.usageCount === undefined)
      return false;
    return isUsageLimitReached({
      planId: storeUser.planId as string,
      usageCount: storeUser.usageCount as number,
    });
  };

  // Load voice preferences
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

    const savedAutoPlay = localStorage.getItem("autoPlayVoice");
    if (savedAutoPlay !== null) {
      setAutoPlayVoice(savedAutoPlay === "true");
    }

    const savedVolume = localStorage.getItem("volume");
    if (savedVolume !== null) {
      setVolume(parseFloat(savedVolume));
    }
  }, []);

  // Voice control handlers
  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    localStorage.setItem("selectedVoiceId", voiceId);
  };

  const handleAutoPlayChange = (checked: boolean) => {
    setAutoPlayVoice(checked);
    localStorage.setItem("autoPlayVoice", checked.toString());
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    localStorage.setItem("volume", newVolume.toString());
  };

  // Handle room selection
  const handleRoomSelect = async (roomId: string) => {
    if (roomId === selectedRoomId) return;

    setSelectedRoomId(roomId);

    // Clear legacy state when switching to new room
    setMessages([]);
    setCurrentSessionId(null);
    setSelectedLevel("");
    setShowTutorLanding(false); // Hide landing page when room is selected

    // Load session information for educational criteria rooms
    try {
      const room = rooms.find(r => r.roomId === roomId);
      console.log("Room selected:", { 
        roomId, 
        room: room ? { 
          type: room.type, 
          sessionId: room.sessionId,
          criteriaId: room.criteriaId,
          title: room.title
        } : null 
      });
      if (room && room.type === "educational-criteria" && room.sessionId) {
        console.log("Setting criteriaSessionId:", room.sessionId);
        setCriteriaSessionId(room.sessionId);
      } else {
        console.log("No sessionId found for educational criteria room");
        setCriteriaSessionId(""); // Only clear if no session found
      }
    } catch (error) {
      console.error("Error loading session for room:", error);
      setCriteriaSessionId(""); // Only clear on error
    }
  };

  // Handle knowledge base selection - shows available levels
  const handleKnowledgeBaseSelection = async (knowledgeBaseId: string) => {
    if (!knowledgeBaseId) return;

    setIsLoadingKnowledgeBase(true);
    try {
      // Find the selected knowledge base
      const knowledgeBase = knowledgeBases.find((kb) => kb.id === knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error("Knowledge base not found");
      }

      // Extract tutor type from the knowledge base level (AA or AI)
      const tutorType = knowledgeBase.level.includes('AA') ? 'AA' : knowledgeBase.level.includes('AI') ? 'AI' : 'Unknown';
      
      // Create SL and HL options for the selected tutor
      const levels = [
        {
          id: `${knowledgeBaseId}-SL`,
          name: `${knowledgeBase.name} - SL`,
          description: `Standard Level for ${knowledgeBase.educationalBoard} ${knowledgeBase.subject}`,
          level: 'SL',
          fullLevel: `${tutorType} SL`,
          educationalBoard: knowledgeBase.educationalBoard,
          subject: knowledgeBase.subject,
          totalChunks: knowledgeBase.totalChunks,
          totalTokens: knowledgeBase.totalTokens,
          fileCount: knowledgeBase.fileCount,
          originalId: knowledgeBaseId
        },
        {
          id: `${knowledgeBaseId}-HL`,
          name: `${knowledgeBase.name} - HL`,
          description: `Higher Level for ${knowledgeBase.educationalBoard} ${knowledgeBase.subject}`,
          level: 'HL',
          fullLevel: `${tutorType} HL`,
          educationalBoard: knowledgeBase.educationalBoard,
          subject: knowledgeBase.subject,
          totalChunks: knowledgeBase.totalChunks,
          totalTokens: knowledgeBase.totalTokens,
          fileCount: knowledgeBase.fileCount,
          originalId: knowledgeBaseId
        }
      ];

      setSelectedKnowledgeBase(knowledgeBaseId);
      setAvailableLevels(levels);
      setSelectionStep('level');
      setShowCriteriaSelector(false);
    } catch (error) {
      console.error("Knowledge base selection error:", error);
      toast({
        title: "Error",
        description: "Failed to select knowledge base",
        variant: "destructive",
      });
    } finally {
      setIsLoadingKnowledgeBase(false);
    }
  };

  // Handle level selection - creates room and session
  const handleLevelSelection = async (levelId: string) => {
    if (!levelId || !selectedKnowledgeBase) return;

    setIsLoadingKnowledgeBase(true);
    try {
      // Find the selected level knowledge base
      const levelKB = availableLevels.find((level) => level.id === levelId);
      if (!levelKB) {
        throw new Error("Level knowledge base not found");
      }

      // Use the original knowledge base ID for the session
      const originalKnowledgeBaseId = levelKB.originalId || selectedKnowledgeBase;
      
      // Create a room for this knowledge base
      const roomTitle = `${levelKB.name} - ${new Date().toLocaleDateString()}`;

      const room = await createRoom({
        title: roomTitle,
        type: "educational-criteria",
        criteriaId: originalKnowledgeBaseId,
      });

      if (room) {
        setSelectedRoomId(room.roomId);
        setSelectedLevel(levelId);
        setShowCriteriaSelector(false);
        setShowTutorLanding(false);

        // Create a session for this knowledge base
        try {
          const response = await apiClient.post("/chat/session", {
            knowledgeBaseId: originalKnowledgeBaseId,
            level: levelKB.level, // Pass the selected level (SL or HL)
          });

          // Set the criteria session ID for message processing
          setCriteriaSessionId(response.data.session.sessionId);

          // Update the room with the session ID
          await chatApi.updateChatRoom(room.roomId, {
            sessionId: response.data.session.sessionId,
          });

          // Update the session with the room ID
          await apiClient.put(`/chat/session/${response.data.session.sessionId}`, {
            roomId: room.roomId,
          });

          toast({
            title: "Knowledge Base and Level Selected",
            description: `Now using ${levelKB.name} for instruction-driven responses.`,
          });
        } catch (sessionError) {
          console.error("Session creation error:", sessionError);
          toast({
            title: "Warning",
            description:
              "Knowledge base and level selected, but session creation failed. Some features may not work properly.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Level selection error:", error);
      toast({
        title: "Error",
        description: "Failed to select level",
        variant: "destructive",
      });
    } finally {
      setIsLoadingKnowledgeBase(false);
    }
  };

  // Handle back to knowledge base selection
  const handleBackToKnowledgeBaseSelection = () => {
    setSelectionStep("knowledgeBase");
    setSelectedKnowledgeBase("");
    setAvailableLevels([]);
  };


  // Send message using new chat system
  const sendMessageToRoom = async (content: string, image?: File) => {
    if (!selectedRoomId) {
      // If no room is selected, show criteria selector instead of creating a general room
      setShowCriteriaSelector(true);
      toast({
        title: "Select Educational Criteria",
        description: "Please select an educational criteria to start chatting.",
        variant: "destructive",
      });
      return;
    }

    if (checkUsageLimit()) {
      toast({
        title: "Usage Limit Reached",
        description:
          "You've reached your question limit. Please upgrade your plan to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim() && !image) return;

    // Check for visual requests and handle WolframAlpha
    const needsVisual = detectVisualRequest(content);
    if (needsVisual) {
      const wolframQuery = generateWolframQuery(content);
      if (wolframQuery) {
        try {
          // Add user message to room first
          const userMessage = await chatApi.sendTextMessage(
            selectedRoomId,
            content
          );
          addMessage(userMessage);

          const imageBase64 = await fetchWolframImage(wolframQuery);

          // Create a more contextual message based on the request type
          let visualMessage = "";
          if (
            content.toLowerCase().includes("explain") ||
            content.toLowerCase().includes("help with")
          ) {
            visualMessage = `Here's a visual representation to help explain ${content
              .replace(
                /(?:explain|help with|illustrate|demonstrate|show how)\s+/i,
                ""
              )
              .replace(
                /\s+with\s+(?:diagram|graph|image|picture|chart|visual)/i,
                ""
              )}:`;
          } else if (
            content.toLowerCase().includes("show me") ||
            content.toLowerCase().includes("create") ||
            content.toLowerCase().includes("generate")
          ) {
            visualMessage = `Here's the visualization you requested:`;
          } else {
            visualMessage = `Here's the visualization of ${wolframQuery.replace(
              /^plot\s+/i,
              ""
            )}:`;
          }

          // Send WolframAlpha message to room
          const wolframMessage = await chatApi.sendWolframMessage(
            selectedRoomId,
            visualMessage,
            imageBase64,
            ""
          );
          addMessage(wolframMessage);

          // Generate follow-up explanation after WolframAlpha image
          console.log("About to generate follow-up explanation for WolframAlpha in room");
          
          // Get AI response from session system and add to room messages
          try {
            console.log("criteriaSessionId:", criteriaSessionId);
            console.log("selectedRoomId:", selectedRoomId);
            console.log("currentRoom:", currentRoom);
            if (criteriaSessionId) {
              console.log("Calling session API for AI response...");
              
              // Show thinking loader
              setIsStreaming(true);
              setStreamingMessage("Tutor is thinking...");
              
              const response = await apiClient.post("/chat/message", {
                sessionId: criteriaSessionId,
                message: content,
                isVoice: false,
              });
              console.log("Session API response:", response.data);

              console.log("Creating room message with AI response...");
              // Add AI response to room messages
              const assistantMessage = await chatApi.sendTextMessage(
                selectedRoomId,
                response.data.response.content,
                "assistant"
              );
              console.log("Room message created:", assistantMessage);
              addMessage(assistantMessage);
              console.log("Message added to room messages");
            } else {
              console.log("No criteriaSessionId available, trying to create session...");
              
              // Try to create a session if we have a room with criteriaId
              if (currentRoom && currentRoom.type === "educational-criteria" && currentRoom.criteriaId) {
                try {
                  console.log("Creating session for room:", currentRoom.roomId);
                  
                  // Show thinking loader
                  setIsStreaming(true);
                  setStreamingMessage("Tutor is thinking...");
                  
                  const response = await apiClient.post("/chat/session", {
                    knowledgeBaseId: currentRoom.criteriaId,
                    level: "SL", // Default level, could be improved
                  });
                  
                  console.log("Session created:", response.data.session.sessionId);
                  setCriteriaSessionId(response.data.session.sessionId);
                  
                  // Update the room with the session ID
                  await chatApi.updateChatRoom(currentRoom.roomId, {
                    sessionId: response.data.session.sessionId,
                  });
                  
                  // Now retry the message
                  const messageResponse = await apiClient.post("/chat/message", {
                    sessionId: response.data.session.sessionId,
                    message: content,
                    isVoice: false,
                  });
                  
                  console.log("Message response after session creation:", messageResponse.data);
                  
                  // Add AI response to room messages
                  const assistantMessage = await chatApi.sendTextMessage(
                    selectedRoomId,
                    messageResponse.data.response.content,
                    "assistant"
                  );
                  addMessage(assistantMessage);
                  
                } catch (sessionError) {
                  console.error("Failed to create session:", sessionError);
                }
              } else {
                console.log("No room or criteriaId available for session creation");
              }
            }
          } catch (error) {
            console.error("Failed to generate follow-up explanation:", error);
            console.error("Error details:", error.response?.data);
          } finally {
            // Hide thinking loader
            setIsStreaming(false);
            setStreamingMessage("");
          }
          return;
        } catch (error) {
          console.error("❌ Wolfram processing failed:", error);
        }
      }
    }

    try {
      // Add user message to room
      const userMessage = await chatApi.sendTextMessage(
        selectedRoomId,
        content
      );
      addMessage(userMessage);

      // Handle image upload with Wolfram
      if (image) {
        setIsStreaming(true);
        setStreamingMessage("Processing image with Wolfram...");
        try {
          const wolframResult = await processImageWithWolfram(image);

          const wolframMessage = await chatApi.sendWolframMessage(
            selectedRoomId,
            wolframResult.interpretation
              ? `🔬 **Wolfram Cloud Analysis**\n\n${wolframResult.interpretation}`
              : "🔬 **Wolfram Cloud Analysis Complete**\n\nI've analyzed your image using Wolfram Language functions.",
            wolframResult.imageBase64 || "",
            wolframResult.interpretation
          );
          addMessage(wolframMessage);
          return;
        } catch (error) {
          console.error("❌ Wolfram processing failed:", error);
          toast({
            title: "Image Processing Failed",
            description: "Failed to process the image. Please try again.",
            variant: "destructive",
          });
          return;
        } finally {
          setIsStreaming(false);
          setStreamingMessage("");
        }
      }

      // Process text message with educational criteria
      await processTextMessageWithRoom(content);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
      setStreamingMessage("");
    }
  };

  // Process text message with room
  const processTextMessageWithRoom = async (message: string) => {
    // Set loading state
    setIsStreaming(true);
    setStreamingMessage("Tutor is thinking...");

    try {
      // Check for visual requests (graphs, plots, equations, diagrams)
      const needsVisual = detectVisualRequest(message);
      if (needsVisual) {
        const wolframQuery = generateWolframQuery(message);
        if (wolframQuery) {
          try {
            const imageBase64 = await fetchWolframImage(wolframQuery);

            // Create a more contextual message based on the request type
            let visualMessage = "";
            if (
              message.toLowerCase().includes("explain") ||
              message.toLowerCase().includes("help with")
            ) {
              visualMessage = `Here's a visual representation to help explain ${message
                .replace(
                  /(?:explain|help with|illustrate|demonstrate|show how)\s+/i,
                  ""
                )
                .replace(
                  /\s+with\s+(?:diagram|graph|image|picture|chart|visual)/i,
                  ""
                )}:`;
            } else if (
              message.toLowerCase().includes("show me") ||
              message.toLowerCase().includes("create") ||
              message.toLowerCase().includes("generate")
            ) {
              visualMessage = `Here's the visualization you requested:`;
            } else {
              visualMessage = `Here's the visualization of ${wolframQuery.replace(
                /^plot\s+/i,
                ""
              )}:`;
            }

            const wolframMessage = await chatApi.sendWolframMessage(
              selectedRoomId!,
              visualMessage,
              imageBase64
            );
            addMessage(wolframMessage);
            return;
          } catch (error) {
            console.error("❌ Wolfram processing failed:", error);
            // Fall through to regular AI processing if Wolfram fails
          }
        }
      }

      // For educational criteria rooms, we need to create a session first
      let sessionId = currentRoom?.sessionId;

      // If no session exists, create one
      if (!sessionId && currentRoom?.type === "educational-criteria") {
        const response = await apiClient.post("/chat/session", {
          knowledgeBaseId: currentRoom.criteriaId,
        });
        sessionId = response.data.session.sessionId;

        // Set the criteria session ID for message processing
        if (sessionId) {
          setCriteriaSessionId(sessionId as string);
        }

        // Update the room with the session ID
        await chatApi.updateChatRoom(currentRoom.roomId, {
          sessionId: sessionId,
        });

        // Update the session with the room ID
        await apiClient.put(`/chat/session/${sessionId}`, {
          roomId: currentRoom.roomId,
        });
      }

      if (sessionId && selectedRoomId) {
        const response = await apiClient.post("/chat/message", {
          sessionId: sessionId,
          message,
          isVoice: false,
        });

        // Visual processing is handled client-side only

        const assistantMessage = await chatApi.sendTextMessage(
          selectedRoomId,
          response.data.response.content,
          "assistant"
        );
        addMessage(assistantMessage);
      } else if (selectedRoomId) {
        // Fallback: send a simple response
        const assistantMessage = await chatApi.sendTextMessage(
          selectedRoomId,
          "I'm here to help! Please select an educational criteria to get more specific assistance.",
          "assistant"
        );
        addMessage(assistantMessage);
      }
    } catch (error) {
      console.error("Criteria message error:", error);
      toast({
        title: "Error",
        description: "Failed to process message with educational criteria",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
      setStreamingMessage("");
    }
  };

  // Legacy message handling for backward compatibility
  const handleSendMessage = async (message: string, image?: File) => {
    if (selectedRoomId) {
      // Use new chat system
      await sendMessageToRoom(message, image);
    } else {
      // Use legacy system
      await handleLegacySendMessage(message, image);
    }
  };

  // Legacy send message function
  const handleLegacySendMessage = async (message: string, image?: File) => {
    if (checkUsageLimit()) {
      toast({
        title: "Usage Limit Reached",
        description:
          "You've reached your question limit. Please upgrade your plan to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim() && !image) return;

    // Add user message to chat
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: image
        ? message.trim() || `Please analyze this image: ${image.name}`
        : message.trim(),
      createdAt: new Date().toISOString(),
      image: image ? URL.createObjectURL(image) : undefined,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Handle image upload with Wolfram
    if (image) {
      try {
        const wolframResult = await processImageWithWolfram(image);

        const wolframMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: wolframResult.interpretation
            ? `🔬 **Wolfram Cloud Analysis**\n\n${wolframResult.interpretation}`
            : "🔬 **Wolfram Cloud Analysis Complete**\n\nI've analyzed your image using Wolfram Language functions.",
          createdAt: new Date().toISOString(),
          wolframImage: wolframResult.imageBase64,
          wolframInterpretation: wolframResult.interpretation,
          wolframGenerated: true,
        };
        setMessages((prev) => [...prev, wolframMessage]);
        return;
      } catch (error) {
        console.error("❌ Wolfram processing failed:", error);
        toast({
          title: "Image Processing Failed",
          description: "Failed to process the image. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Process text message
    await processTextMessage(message.trim());
  };

  const processTextMessage = async (message: string) => {
    const needsVisual = detectVisualRequest(message);
    if (needsVisual) {
      const wolframQuery = generateWolframQuery(message);
      if (wolframQuery) {
        try {
          const imageBase64 = await fetchWolframImage(wolframQuery);

          // Create a more contextual message based on the request type
          let visualMessage = "";
          if (
            message.toLowerCase().includes("explain") ||
            message.toLowerCase().includes("help with")
          ) {
            visualMessage = `Here's a visual representation to help explain ${message
              .replace(
                /(?:explain|help with|illustrate|demonstrate|show how)\s+/i,
                ""
              )
              .replace(
                /\s+with\s+(?:diagram|graph|image|picture|chart|visual)/i,
                ""
              )}:`;
          } else if (
            message.toLowerCase().includes("show me") ||
            message.toLowerCase().includes("create") ||
            message.toLowerCase().includes("generate")
          ) {
            visualMessage = `Here's the visualization you requested:`;
          } else {
            visualMessage = `Here's the visualization of ${wolframQuery.replace(
              /^plot\s+/i,
              ""
            )}:`;
          }

          const wolframMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: visualMessage,
            createdAt: new Date().toISOString(),
            wolframImage: imageBase64,
            wolframGenerated: true,
          };
          setMessages((prev) => [...prev, wolframMessage]);

          // Generate follow-up explanation after WolframAlpha image
          console.log("About to call sendCriteriaMessage for WolframAlpha follow-up");
          await sendCriteriaMessage(message);
          return;
        } catch (error) {
          console.error("❌ Wolfram processing failed:", error);
        }
      }
    }

    await sendCriteriaMessage(message);
  };

  const sendCriteriaMessage = async (message: string) => {
    console.log("sendCriteriaMessage called with:", { criteriaSessionId, message: message.trim() });
    if (!criteriaSessionId || !message.trim()) {
      console.log("sendCriteriaMessage early return - missing criteriaSessionId or empty message");
      return;
    }

    setIsStreaming(true);
    setStreamingMessage("");
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await apiClient.post("/chat/message", {
        sessionId: criteriaSessionId,
        message,
        isVoice: false,
      });

      // Visual processing is handled client-side only

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.data.response.content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Criteria message error:", error);
      toast({
        title: "Error",
        description: "Failed to send message to educational criteria",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
      setStreamingMessage("");
      refreshUser();
    }
  };

  // Handle new chat - prompt for two-step selection
  const handleNewChat = async () => {
    if (isCreatingNewChat) return; // Prevent multiple clicks

    try {
      setIsCreatingNewChat(true);

      // Clear current selection
      setSelectedRoomId(null);
      setCurrentSessionId(null);
      setMessages([]);
      setStreamingMessage("");
      setIsStreaming(false);
      setSelectedKnowledgeBase("");
      setSelectedLevel("");
      setAvailableLevels([]);
      setCriteriaSessionId("");
      setShowCriteriaSelector(false);
      setShowTutorLanding(true); // Show the landing page
      setSelectionStep("knowledgeBase"); // Reset to first step

      // Close sidebar on mobile after creating new chat
      if (window.innerWidth < 1024) {
        setShowSidebar(false);
      }

      // Show success toast
      toast({
        title: "New Chat Started",
        description: "Please select a subject and level to begin your new chat.",
      });
    } catch (error) {
      console.error("Error creating new chat:", error);
      toast({
        title: "Error",
        description: "Failed to create new chat. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingNewChat(false);
    }
  };

  // Handle sidebar collapse toggle
  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Handle auto-play toggle
  const handleToggleAutoPlay = () => {
    setAutoPlayVoice(!autoPlayVoice);
    localStorage.setItem("autoPlayVoice", (!autoPlayVoice).toString());
  };

  const handleScrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  };

  // Auto-scroll functionality with debouncing
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setShouldAutoScroll(isAtBottom);

      // Show/hide scroll to bottom button
      setShowScrollToBottom(!isAtBottom && scrollHeight > clientHeight);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Check if user scrolled to top to load more messages (only after initial load)
      if (
        scrollTop < 50 &&
        hasMore &&
        !loadingMore &&
        roomMessages.length > 0 &&
        hasInitiallyLoaded
      ) {
        // Debounce the load more call
        scrollTimeoutRef.current = setTimeout(() => {
          setIsLoadingOlderMessages(true);
          loadMoreMessages();
        }, 300); // 300ms debounce
      }
    }
  };

  useEffect(() => {
    const messageCount =
      selectedRoomId && roomMessages.length > 0
        ? roomMessages.length
        : messages.length;
    // Don't auto-scroll if we're loading older messages
    if (
      shouldAutoScroll &&
      (messageCount > 0 || isStreaming) &&
      !isLoadingOlderMessages
    ) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    selectedRoomId,
    roomMessages.length,
    messages.length,
    isStreaming,
    shouldAutoScroll,
    isLoadingOlderMessages,
  ]);

  // Reset loading older messages state when loading completes
  useEffect(() => {
    if (!loadingMore && isLoadingOlderMessages) {
      setIsLoadingOlderMessages(false);
    }
  }, [loadingMore, isLoadingOlderMessages]);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Set initial load flag when messages are first loaded
  useEffect(() => {
    if (selectedRoomId && roomMessages.length > 0 && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    } else if (!selectedRoomId) {
      setHasInitiallyLoaded(false);
    }
  }, [selectedRoomId, roomMessages.length, hasInitiallyLoaded]);

  useEffect(() => {
    const messageCount =
      selectedRoomId && roomMessages.length > 0
        ? roomMessages.length
        : messages.length;
    if (messageCount > 0) {
      setShouldAutoScroll(true);
    }
  }, [selectedRoomId]);

  // Auto-scroll to bottom when room changes
  useEffect(() => {
    if (selectedRoomId && roomMessages.length > 0) {
      setShouldAutoScroll(true);
      // Force scroll to bottom after a short delay to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 200);
    }
  }, [selectedRoomId]);

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

    // Handle knowledge base logic here if needed
  };

  // Get current tutor display info
  const getCurrentTutorInfo = () => {
    if (currentRoom) {
      return {
        title: currentRoom.title,
        description: `Chat Room - ${currentRoom.type.replace("-", " ")}`,
        icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
        gradient: "from-blue-500 to-purple-600",
        bgColor: "bg-gradient-to-r from-blue-50 to-purple-50",
        borderColor: "border-blue-200",
      };
    }

    if (selectedLevel) {
      const levelKB = availableLevels?.find((level) => level.id === selectedLevel);
      return {
        title: `Knowledge Base: ${levelKB?.name || "Unknown"}`,
        description:
          levelKB?.description ||
          "Instruction-driven responses based on educational standards",
        icon: <Database className="w-6 h-6 text-blue-600" />,
        gradient: "from-blue-500 to-purple-600",
        bgColor: "bg-gradient-to-r from-blue-50 to-purple-50",
        borderColor: "border-blue-200",
      };
    }

    return {
      title: "Educational Criteria Tutor",
      description: "Select a tutor to begin learning",
      icon: <Lightbulb className="w-6 h-6 text-blue-600" />,
      gradient: "from-blue-500 to-purple-600",
      bgColor: "bg-gradient-to-r from-blue-50 to-purple-50",
      borderColor: "border-blue-200",
    };
  };

  const tutorInfo = getCurrentTutorInfo();



  // Show landing page if no room is selected and no legacy session
    if ((showTutorLanding || !selectedLevel) && !selectedRoomId) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-16">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 shadow-sm">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  Educational Criteria Tutor
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                </h1>
                <p className="text-sm text-gray-600">
                  Select an educational tutor to begin learning
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => fetchKnowledgeBases()}
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50"
                disabled={isFetchingKnowledgeBases}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    isFetchingKnowledgeBases ? "animate-spin" : ""
                  }`}
                />
                {isFetchingKnowledgeBases ? "Loading..." : "Refresh"}
              </Button>
              <Button
                onClick={() => setShowSidebar(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Menu className="w-4 h-4 mr-2" />
                Chat Rooms
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-4xl mx-auto">
            {/* Welcome Section */}
            <div className="text-center mb-8">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Choose Your Educational Tutor
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Select from our available educational criteria tutors to get
                personalized learning assistance
              </p>
            </div>

            {/* Two-Step Selection */}
            <div className="space-y-6">
              {!knowledgeBases || knowledgeBases.length === 0 ? (
                /* No knowledge bases available */
                <div className="text-center py-12 text-gray-500">
                  <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Database className="w-10 h-10 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">
                    No Knowledge Bases Available
                  </h4>
                  <p className="text-gray-500 mb-4">
                    {storeUser?.role === "admin"
                      ? "Upload documents to create knowledge bases"
                      : "No knowledge bases have been configured yet. Contact an administrator to add knowledge bases."}
                  </p>
                  <div className="text-xs text-gray-400 mb-4">
                    Debug: knowledgeBases length = {knowledgeBases?.length || 0}
                  </div>
                  {storeUser?.role === "admin" && (
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 rounded-xl px-6 py-2">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Upload Documents
                    </Button>
                  )}
                </div>
              ) : selectionStep === "knowledgeBase" ? (
                /* Step 1: Knowledge Base Selection */
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      Step 1: Choose Your Subject
                    </h3>
                    <p className="text-gray-600">
                      Select a subject to start learning with AI tutoring
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {knowledgeBases.map((kb) => (
                      <div
                        key={kb.id}
                        className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                        onClick={() => handleKnowledgeBaseSelection(kb.id)}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
                            <Database className="w-8 h-8" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                              {kb.educationalBoard} {kb.subject}
                              <Sparkles className="w-5 h-5 text-blue-600" />
                            </h4>
                            <p className="text-gray-600 font-medium mb-2">
                              {kb.name.includes('AA') ? 'Analysis & Approaches' : 'Applications & Interpretation'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {kb.description}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Crown className="w-4 h-4" />
                              {kb.level}
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {kb.fileCount} files
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{kb.totalChunks} chunks</span>
                            <span>{kb.totalTokens} tokens</span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-center">
                          <Button 
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 rounded-xl"
                            disabled={isLoadingKnowledgeBase}
                          >
                            <GraduationCap className="w-4 h-4 mr-2" />
                            {isLoadingKnowledgeBase ? "Loading..." : `Select ${kb.educationalBoard} ${kb.subject}`}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Step 2: Level Selection */
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      Step 2: Choose Your Level
                    </h3>
                    <p className="text-gray-600">
                      Select SL or HL for {knowledgeBases.find(kb => kb.id === selectedKnowledgeBase)?.name || 'your selected tutor'}
                    </p>
                    <Button
                      onClick={handleBackToKnowledgeBaseSelection}
                      variant="outline"
                      className="mt-2"
                    >
                      ← Back to Subjects
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {availableLevels.map((level) => (
                      <div
                        key={level.id}
                        className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                        onClick={() => handleLevelSelection(level.id)}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
                            <Database className="w-8 h-8" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                              {level.name}
                              <Sparkles className="w-5 h-5 text-blue-600" />
                            </h4>
                            <p className="text-gray-600 font-medium mb-2">
                              {level.description}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Crown className="w-4 h-4" />
                              {level.level}
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {level.fileCount} files
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{level.totalChunks} chunks</span>
                            <span>{level.totalTokens} tokens</span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-center">
                          <Button 
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 rounded-xl"
                            disabled={isLoadingKnowledgeBase}
                          >
                            <GraduationCap className="w-4 h-4 mr-2" />
                            {isLoadingKnowledgeBase ? "Loading..." : `Select ${level.level} Level`}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-white overflow-hidden">
      {/* Mobile Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Modern Sidebar */}
      {showSidebar && (
        <div className="fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto">
          <ModernSidebar
            selectedRoomId={selectedRoomId}
            onRoomSelect={handleRoomSelect}
            onNewChat={handleNewChat}
            onToggleTools={onToggleMobileTools}
            onToggleAutoPlay={handleToggleAutoPlay}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebarCollapse}
            onClose={() => setShowSidebar(false)}
            isCreatingNewChat={isCreatingNewChat}
            className="h-full"
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Enhanced Header */}
        <TutorHeader
          selectedVoiceId={selectedVoiceId}
          onVoiceChange={setSelectedVoiceId}
          autoPlayVoice={autoPlayVoice}
          onToggleAutoPlay={handleToggleAutoPlay}
          volume={volume}
          onVolumeChange={setVolume}
          userCredits={
            storeUser && storeUser.planId
              ? getRemainingCredits({
                  planId: storeUser.planId as string,
                  usageCount: storeUser.usageCount || 0,
                })
              : 0
          }
        />

        {/* Mobile Menu Button - Only visible on mobile */}
        <div className="lg:hidden px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages Container - Scrollable */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-6 py-4 bg-gradient-to-r from-green-50/30 via-slate-50/20 to-white/50 min-h-0"
          onScroll={handleScroll}
        >
          {/* Loading more messages indicator */}
          {loadingMore && (
            <div
              ref={messagesTopRef}
              className="flex items-center justify-center py-4"
            >
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">
                  Loading more messages...
                </span>
              </div>
            </div>
          )}

          {/* Welcome Message */}
          {currentMessages.length === 0 && !isStreaming && (
            <div className="flex justify-center py-8">
              <div className="max-w-4xl lg:max-w-5xl w-full">
                <MessageBubble
                  role="assistant"
                  content={`Hello! I'm your friendly educational criteria tutor. I can help you with questions based on educational standards, and I'm also happy to chat casually! Feel free to ask me anything about the curriculum, or just say hi! 😊`}
                  timestamp={new Date().toISOString()}
                  selectedVoiceId={selectedVoiceId}
                  autoPlayVoice={autoPlayVoice}
                  volume={volume}
                />
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="max-w-5xl mx-auto space-y-3">
            {currentMessages.map((message, index) => (
              <MessageBubble
                key={`${index}-${selectedVoiceId}`}
                role={message.role}
                content={message.content}
                image={message.image}
                wolframImage={message.wolframImage}
                wolframInterpretation={message.wolframInterpretation}
                wolframGenerated={message.wolframGenerated}
                timestamp={message.createdAt}
                isStreaming={
                  isStreaming && index === currentMessages.length - 1
                }
                selectedVoiceId={selectedVoiceId}
                autoPlayVoice={autoPlayVoice}
                volume={volume}
              />
            ))}

            {/* Typing Indicator */}
            {isStreaming && (
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg bg-gradient-to-r from-blue-500 to-purple-600">
                  <Database className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div className="bg-white rounded-2xl px-6 py-4 shadow-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full animate-bounce bg-blue-400"></div>
                    <div
                      className="w-2 h-2 rounded-full animate-bounce bg-blue-400"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full animate-bounce bg-blue-400"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <span className="text-sm font-medium ml-3 text-blue-600">
                      {streamingMessage || "Tutor is thinking..."}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Scroll to Bottom Button */}
        {showScrollToBottom && (
          <div className="fixed bottom-20 right-6 z-50">
            <Button
              onClick={handleScrollToBottom}
              className="rounded-full w-12 h-12 bg-blue-600 hover:bg-blue-700 shadow-lg"
              size="sm"
            >
              <ArrowDown className="w-5 h-5 text-white" />
            </Button>
          </div>
        )}

        {/* Message Input - Fixed at bottom */}
        <div className="sticky bottom-0 bg-white shadow-inner border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={storeUser ? checkUsageLimit() : false}
              sessionId={selectedRoomId || criteriaSessionId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
