import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/utils/apiClient";
import MessageBubble from "./MessageBubble";
import ChatRoomSelector from "./ChatRoomSelector";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UIAction,
} from "@/lib/intentDetector";
import { fetchWolframImage, parsePlotQuery, processImageWithWolfram, detectVisualRequest, generateWolframQuery } from "@/utils/wolframClient";
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
  X
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

  // Legacy state for backward compatibility
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("alloy");
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);
  const [volume, setVolume] = useState(0.7);

  // Educational criteria state
  const [tutorMode, setTutorMode] = useState<"ib" | "criteria">("criteria");
  const [criteriaList, setCriteriaList] = useState<EducationalCriteria[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<string>("");
  const [criteriaSessionId, setCriteriaSessionId] = useState<string>("");
  const [showCriteriaSelector, setShowCriteriaSelector] = useState(false);
  const [isLoadingCriteria, setIsLoadingCriteria] = useState(false);
  const [showTutorLanding, setShowTutorLanding] = useState(true);

  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { user: storeUser, refreshUser } = useAuth();

  // Use chat room hooks
  const { rooms, loading: roomsLoading, createRoom } = useChatRooms();
  const { 
    room: currentRoom, 
    messages: roomMessages, 
    loading: roomLoading,
    addMessage,
    updateMessage,
    removeMessage 
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
    createdAt: chatMessage.createdAt
  });

  // Load the last active chat room
  const loadLastChat = async () => {
    try {
      if (rooms.length > 0) {
        // Find the most recently active room
        const activeRooms = rooms.filter(room => room.isActive);
        
        const lastRoom = activeRooms
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())[0];
        
        
        if (lastRoom) {
          setSelectedRoomId(lastRoom.roomId);
          setShowTutorLanding(false);
          
          // If it's an educational criteria room, set the criteria
          if (lastRoom.type === 'educational-criteria' && lastRoom.criteriaId) {
            setSelectedCriteria(lastRoom.criteriaId);
          }
        }
      }
    } catch (error) {
      console.error('Error loading last chat:', error);
    }
  };

  // Fetch educational criteria on component mount
  useEffect(() => {
    fetchCriteriaList();
  }, []);

  // Load last chat when rooms are loaded
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      loadLastChat();
    }
  }, [rooms, selectedRoomId]);

  // Persist selected room ID in localStorage
  useEffect(() => {
    if (selectedRoomId) {
      localStorage.setItem('selectedRoomId', selectedRoomId);
    }
  }, [selectedRoomId]);

  // Load selected room ID from localStorage on mount
  useEffect(() => {
    const savedRoomId = localStorage.getItem('selectedRoomId');
    if (savedRoomId && rooms.length > 0) {
      const roomExists = rooms.find(room => room.roomId === savedRoomId);
      if (roomExists) {
        setSelectedRoomId(savedRoomId);
        setShowTutorLanding(false);
        
        // If it's an educational criteria room, set the criteria
        if (roomExists.type === 'educational-criteria' && roomExists.criteriaId) {
          setSelectedCriteria(roomExists.criteriaId);
        }
      }
    }
  }, [rooms]);

  const fetchCriteriaList = async () => {
    try {
      const response = await apiClient.get('/knowledge-base');
      const criteria = response.data.criteria || response.data.knowledgeBases || response.data || [];
      setCriteriaList(Array.isArray(criteria) ? criteria : []);
    } catch (error) {
      console.error('Error fetching educational criteria:', error);
      setCriteriaList([]);
    }
  };

  // Check usage limit
  const checkUsageLimit = () => {
    if (!storeUser || !storeUser.planId || storeUser.usageCount === undefined) return false;
    return isUsageLimitReached({
      planId: storeUser.planId as string,
      usageCount: storeUser.usageCount as number
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

    const savedAutoPlay = localStorage.getItem('autoPlayVoice');
    if (savedAutoPlay !== null) {
      setAutoPlayVoice(savedAutoPlay === 'true');
    }

    const savedVolume = localStorage.getItem('volume');
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
    localStorage.setItem('autoPlayVoice', checked.toString());
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    localStorage.setItem('volume', newVolume.toString());
  };

  // Handle room selection
  const handleRoomSelect = async (roomId: string) => {
    if (roomId === selectedRoomId) return;
    
    setSelectedRoomId(roomId);
    setShowSidebar(false);
    
    // Clear legacy state when switching to new room
    setMessages([]);
    setCurrentSessionId(null);
    setCriteriaSessionId("");
    setSelectedCriteria("");
  };


  // Handle criteria selection - automatically creates room
  const handleCriteriaSelection = async (criteriaId: string) => {
    if (!criteriaId) return;
    
    setIsLoadingCriteria(true);
    try {
      // Always create a new room for each criteria selection to ensure fresh start
      const criteria = criteriaList.find(c => c.id === criteriaId);
      const roomTitle = `${criteria?.name || 'Educational Criteria'} - ${new Date().toLocaleDateString()}`;
      
      const room = await createRoom({
        title: roomTitle,
        type: "educational-criteria",
        criteriaId: criteriaId
      });
      
      if (room) {
        setSelectedRoomId(room.roomId);
        setSelectedCriteria(criteriaId);
        setShowCriteriaSelector(false);
        setShowTutorLanding(false);
        
        // Create a session for this criteria
        try {
          const response = await apiClient.post('/chat/session', {
            criteriaId: criteriaId
          });
          
          // Update the room with the session ID
          await chatApi.updateChatRoom(room.roomId, {
            sessionId: response.data.session.sessionId
          });
          
          toast({
            title: "Educational Criteria Selected",
            description: `Now using ${criteriaList.find(c => c.id === criteriaId)?.name || 'Unknown'} criteria for instruction-driven responses.`,
          });
        } catch (sessionError) {
          console.error("Session creation error:", sessionError);
          toast({
            title: "Warning",
            description: "Educational criteria selected, but session creation failed. Some features may not work properly.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Criteria selection error:", error);
      toast({
        title: "Error",
        description: "Failed to select educational criteria",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCriteria(false);
    }
  };

  // Handle tutor selection (legacy functionality)
  const handleTutorSelection = async (criteriaId: string) => {
    await handleCriteriaSelection(criteriaId);
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
        description: "You've reached your question limit. Please upgrade your plan to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim() && !image) return;

    try {
      // Add user message to room
      const userMessage = await chatApi.sendTextMessage(selectedRoomId, content);
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
      console.error('Error sending message:', error);
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
            if (message.toLowerCase().includes('explain') || message.toLowerCase().includes('help with')) {
              visualMessage = `Here's a visual representation to help explain ${message.replace(/(?:explain|help with|illustrate|demonstrate|show how)\s+/i, "").replace(/\s+with\s+(?:diagram|graph|image|picture|chart|visual)/i, "")}:`;
            } else if (message.toLowerCase().includes('show me') || message.toLowerCase().includes('create') || message.toLowerCase().includes('generate')) {
              visualMessage = `Here's the visualization you requested:`;
            } else {
              visualMessage = `Here's the visualization of ${wolframQuery.replace(/^plot\s+/i, "")}:`;
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
      if (!sessionId && currentRoom?.type === 'educational-criteria') {
        const response = await apiClient.post('/chat/session', {
          criteriaId: currentRoom.criteriaId
        });
        sessionId = response.data.session.sessionId;
        
        // Update the room with the session ID
        await chatApi.updateChatRoom(currentRoom.roomId, {
          sessionId: sessionId
        });
      }

      if (sessionId && selectedRoomId) {
        const response = await apiClient.post('/chat/message', {
          sessionId: sessionId,
          message,
          isVoice: false
        });

        // Visual processing is handled client-side only

        const assistantMessage = await chatApi.sendTextMessage(
          selectedRoomId,
          response.data.response.content,
          'assistant'
        );
        addMessage(assistantMessage);
      } else if (selectedRoomId) {
        // Fallback: send a simple response
        const assistantMessage = await chatApi.sendTextMessage(
          selectedRoomId,
          "I'm here to help! Please select an educational criteria to get more specific assistance.",
          'assistant'
        );
        addMessage(assistantMessage);
      }
    } catch (error) {
      console.error('Criteria message error:', error);
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
        description: "You've reached your question limit. Please upgrade your plan to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim() && !image) return;

    // Add user message to chat
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: image ? (message.trim() || `Please analyze this image: ${image.name}`) : message.trim(),
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
          if (message.toLowerCase().includes('explain') || message.toLowerCase().includes('help with')) {
            visualMessage = `Here's a visual representation to help explain ${message.replace(/(?:explain|help with|illustrate|demonstrate|show how)\s+/i, "").replace(/\s+with\s+(?:diagram|graph|image|picture|chart|visual)/i, "")}:`;
          } else if (message.toLowerCase().includes('show me') || message.toLowerCase().includes('create') || message.toLowerCase().includes('generate')) {
            visualMessage = `Here's the visualization you requested:`;
          } else {
            visualMessage = `Here's the visualization of ${wolframQuery.replace(/^plot\s+/i, "")}:`;
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
          return;
        } catch (error) {
          console.error("❌ Wolfram processing failed:", error);
        }
      }
    }

    await sendCriteriaMessage(message);
  };

  const sendCriteriaMessage = async (message: string) => {
    if (!criteriaSessionId || !message.trim()) return;

    setIsStreaming(true);
    setStreamingMessage("");
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await apiClient.post('/chat/message', {
        sessionId: criteriaSessionId,
        message,
        isVoice: false
      });

      // Visual processing is handled client-side only

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.data.response.content,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Criteria message error:', error);
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

  // Handle new chat
  const handleNewChat = () => {
    setSelectedRoomId(null);
    setCurrentSessionId(null);
    setMessages([]);
    setStreamingMessage("");
    setIsStreaming(false);
    setSelectedCriteria("");
    setCriteriaSessionId("");
    setShowCriteriaSelector(false);
    setShowTutorLanding(true);
  };

  // Auto-scroll functionality
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setShouldAutoScroll(isAtBottom);
    }
  };

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
      // Handle IB tutor logic here
    }
  };

  // Get current tutor display info
  const getCurrentTutorInfo = () => {
    if (currentRoom) {
      return {
        title: currentRoom.title,
        description: `Chat Room - ${currentRoom.type.replace('-', ' ')}`,
        icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
        gradient: "from-blue-500 to-purple-600",
        bgColor: "bg-gradient-to-r from-blue-50 to-purple-50",
        borderColor: "border-blue-200"
      };
    }

    if (selectedCriteria) {
      const criteria = criteriaList?.find(c => c.id === selectedCriteria);
      return {
        title: `Educational Criteria: ${criteria?.name || 'Unknown'}`,
        description: criteria?.description || 'Instruction-driven responses based on educational standards',
        icon: <Database className="w-6 h-6 text-blue-600" />,
        gradient: "from-blue-500 to-purple-600",
        bgColor: "bg-gradient-to-r from-blue-50 to-purple-50",
        borderColor: "border-blue-200"
      };
    }

    return {
      title: "Educational Criteria Tutor",
      description: "Select a tutor to begin learning",
      icon: <Lightbulb className="w-6 h-6 text-blue-600" />,
      gradient: "from-blue-500 to-purple-600",
      bgColor: "bg-gradient-to-r from-blue-50 to-purple-50",
      borderColor: "border-blue-200"
    };
  };

  const tutorInfo = getCurrentTutorInfo();

  // Get current messages (either from room or legacy)
  const currentMessages = selectedRoomId && roomMessages.length > 0 
    ? roomMessages.map(convertToLegacyMessage)
    : messages;

  // Show landing page if no room is selected and no legacy session
  if ((showTutorLanding || !selectedCriteria) && !selectedRoomId) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-16">
        {/* Landing Page Header */}
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
                <p className="text-sm text-gray-600">Select an educational tutor to begin learning</p>
              </div>
            </div>
            <Button
              onClick={() => setShowSidebar(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Menu className="w-4 h-4 mr-2" />
              Chat Rooms
            </Button>
          </div>
        </div>

        {/* Landing Page Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-4xl mx-auto">
            {/* Welcome Section */}
            <div className="text-center mb-8">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Choose Your Educational Tutor</h2>
              <p className="text-lg text-gray-600 mb-6">
                Select from our available educational criteria tutors to get personalized learning assistance
              </p>
            </div>

            {/* Available Tutors */}
            <div className="space-y-6">
              {(!criteriaList || criteriaList.length === 0) ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Database className="w-10 h-10 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">No Educational Tutors Available</h4>
                  <p className="text-gray-500 mb-4">
                    {storeUser?.role === 'admin' 
                      ? 'Upload documents to create educational criteria' 
                      : 'No educational criteria have been uploaded yet. Contact an administrator to add criteria.'}
                  </p>
                  {storeUser?.role === 'admin' && (
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 rounded-xl px-6 py-2">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Upload Documents
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {criteriaList && criteriaList.map((criteria) => (
                    <div
                      key={criteria.id}
                      className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                      onClick={() => handleTutorSelection(criteria.id)}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
                          <Database className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            {criteria.name}
                            <Sparkles className="w-5 h-5 text-blue-600" />
                          </h4>
                          <p className="text-gray-600 font-medium mb-2">{criteria.description}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                            {criteria.educationalBoard}
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                            {criteria.subject}
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                            {criteria.level}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{criteria.totalChunks} chunks</span>
                          <span>{criteria.totalTokens.toLocaleString()} tokens</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-center">
                        <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 rounded-xl">
                          <GraduationCap className="w-4 h-4 mr-2" />
                          Start Learning
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-16">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 border-r border-gray-200 bg-white">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Chat Rooms</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ChatRoomSelector
            selectedRoomId={selectedRoomId}
            onRoomSelect={handleRoomSelect}
            className="h-full"
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            {/* Room Info */}
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${tutorInfo.gradient} shadow-sm`}>
                {tutorInfo.icon}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  {tutorInfo.title}
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                </h1>
                <p className="text-sm text-gray-600">{tutorInfo.description}</p>
              </div>
            </div>

            {/* Voice Controls */}
            <div className="flex items-center space-x-3 bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Voice:</span>
                <TutorSelector
                  selectedVoiceId={selectedVoiceId}
                  onVoiceChange={handleVoiceChange}
                />
              </div>
              <div className="w-px h-6 bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-play-voice"
                  checked={autoPlayVoice}
                  onCheckedChange={handleAutoPlayChange}
                  className="w-4 h-4"
                />
                <label htmlFor="auto-play-voice" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Auto-play
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                className="text-xs font-medium px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 text-white hover:from-indigo-600 hover:to-blue-700"
                onClick={onToggleMobileTools}
              >
                <Settings className="w-4 h-4 mr-1" />
                Tools
              </Button>

              <Button
                variant="outline"
                onClick={handleNewChat}
                className="text-xs font-medium px-3 py-2 rounded-lg"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                New
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-xs font-medium px-3 py-2 rounded-lg"
              >
                <Menu className="w-4 h-4 mr-1" />
                Rooms
              </Button>
            </div>

            {/* Credits Badge */}
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 border border-amber-200 rounded-full text-xs font-medium text-amber-800">
              <Crown className="w-3 h-3" />
              <span>{storeUser && storeUser.planId ? getRemainingCredits({
                planId: storeUser.planId as string,
                usageCount: storeUser.usageCount || 0
              }) : 0}</span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 bg-gradient-to-b from-white to-gray-50"
          onScroll={handleScroll}
        >
          {/* Welcome Message */}
          {currentMessages.length === 0 && !isStreaming && (
            <div className="flex justify-center">
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
          <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 sm:space-y-8">
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
                isStreaming={isStreaming && index === currentMessages.length - 1}
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

        {/* Message Input */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4 shadow-lg">
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
