import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Bot, User, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const TutorPage = () => {
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKB, setSelectedKB] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [chatSessions, setChatSessions] = useState([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch knowledge bases
  const fetchKnowledgeBases = async () => {
    try {
      const response = await axios.get('/api/knowledge-base');
      setKnowledgeBases(response.data.knowledgeBases);
    } catch (error) {
      toast.error('Failed to fetch knowledge bases');
      console.error('Error fetching knowledge bases:', error);
    }
  };

  // Fetch available voices
  const fetchVoices = async () => {
    try {
      const response = await axios.get('/api/voice/voices');
      setVoices(response.data.voices);
    } catch (error) {
      console.error('Error fetching voices:', error);
    }
  };

  // Fetch chat sessions
  const fetchChatSessions = async () => {
    try {
      const response = await axios.get('/api/chat-rooms/rooms');
      setChatSessions(response.data.rooms || []);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    }
  };

  useEffect(() => {
    fetchKnowledgeBases();
    fetchVoices();
    fetchChatSessions();
    
    // Load the most recent chat session if any exists
    const loadMostRecentChat = async () => {
      try {
        const response = await axios.get('/api/chat-rooms/rooms');
        const rooms = response.data.rooms || [];
        
        if (rooms.length > 0) {
          // Find the most recent room
          const mostRecentRoom = rooms.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))[0];
          if (mostRecentRoom) {
            await loadChatSession(mostRecentRoom.roomId);
            toast.success('Loaded your last chat session');
          }
        }
      } catch (error) {
        console.error('Error loading most recent chat:', error);
      }
    };
    
    loadMostRecentChat();
  }, []);

  // Scroll to bottom when new messages arrive
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  // Create new chat session (only when user sends first message)
  const createSession = async (kbId) => {
    try {
      const response = await axios.post('/api/chat/session', {
        criteriaId: kbId
      });
      setSessionId(response.data.session.sessionId);
      setRoomId(response.data.session.roomId);
      setMessages([]);
      toast.success('New chat session started');
    } catch (error) {
      toast.error('Failed to create chat session');
      console.error('Error creating session:', error);
    }
  };

  // Load the most recent chat session for the selected KB
  const loadLastChatSession = async (kbId) => {
    try {
      // Get all chat sessions for this user
      const response = await axios.get('/api/chat-rooms/rooms');
      const rooms = response.data.rooms || [];
      
      // Find the most recent room for this KB
      const recentRoom = rooms
        .filter(room => room.criteriaId === kbId)
        .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))[0];
      
      if (recentRoom) {
        // Load the existing chat session
        await loadChatSession(recentRoom.roomId);
        toast.success('Loaded last chat session');
      } else {
        // No previous chat for this KB, don't create one yet
        setSessionId('');
        setRoomId('');
        setMessages([]);
        setSelectedKB(kbId);
      }
    } catch (error) {
      console.error('Error loading last chat session:', error);
      // Fallback: just set the KB without creating session
      setSessionId('');
      setRoomId('');
      setMessages([]);
      setSelectedKB(kbId);
    }
  };

  // Create new chat (save current and start new)
  const createNewChat = async () => {
    if (!selectedKB) {
      toast.error('Please select a knowledge base first');
      return;
    }

    try {
      const response = await axios.post('/api/chat/new-chat', {
        criteriaId: selectedKB
      });
      setSessionId(response.data.session.sessionId);
      setRoomId(response.data.session.roomId);
      setMessages([]);
      fetchChatSessions(); // Refresh chat sessions list
      toast.success('New chat created');
    } catch (error) {
      toast.error('Failed to create new chat');
      console.error('Error creating new chat:', error);
    }
  };

  // Load existing chat session
  const loadChatSession = async (roomId) => {
    try {
      const response = await axios.get(`/api/chat/room/${roomId}`);
      const session = response.data.session;
      
      setSessionId(session.sessionId);
      setRoomId(session.roomId);
      setSelectedKB(session.criteriaId);
      setMessages(session.messages || []);
      setShowChatHistory(false);
      toast.success('Chat session loaded');
    } catch (error) {
      toast.error('Failed to load chat session');
      console.error('Error loading chat session:', error);
    }
  };

  // Handle knowledge base selection
  const handleKBSelection = (kbId) => {
    setSelectedKB(kbId);
    loadLastChatSession(kbId);
  };

  // Send message
  const sendMessage = async (message, isVoice = false) => {
    if (!message.trim()) return;
    
    // If no session exists, create one first
    if (!sessionId && selectedKB) {
      await createSession(selectedKB);
      // Wait a moment for session to be created
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!sessionId) {
      toast.error('Please select a knowledge base first');
      return;
    }

    setIsLoading(true);
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      isVoice
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      const response = await axios.post('/api/chat/message', {
        sessionId,
        message,
        isVoice
      });

      // Visual processing is handled client-side only

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response.content,
        timestamp: response.data.response.timestamp,
        responseTime: response.data.response.responseTime
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-play response if it was a voice message
      if (isVoice) {
        await playAudioResponse(response.data.response.content);
      }
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle text input
  const handleTextSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputMessage, false);
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await processAudioInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('Microphone access denied');
      console.error('Error starting recording:', error);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Process audio input
  const processAudioInput = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      const response = await axios.post('/api/voice/stt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const transcription = response.data.transcription.text;
      if (transcription.trim()) {
        sendMessage(transcription, true);
      } else {
        toast.error('No speech detected');
      }
    } catch (error) {
      toast.error('Failed to process audio');
      console.error('Error processing audio:', error);
    }
  };

  // Play audio response
  const playAudioResponse = async (text) => {
    try {
      setIsPlaying(true);
      const response = await axios.post('/api/voice/tts', {
        text,
        voice: selectedVoice
      }, {
        responseType: 'blob'
      });

      const audioUrl = URL.createObjectURL(response.data);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (error) {
      toast.error('Failed to generate speech');
      console.error('Error generating speech:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Handle audio end
  const handleAudioEnd = () => {
    setIsPlaying(false);
  };

  const selectedKBData = knowledgeBases.find(kb => kb.id === selectedKB);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Tutor</h1>
          <p className="text-gray-600 mt-2">Interactive learning with voice and text</p>
        </div>
        <div className="flex items-center space-x-4">
          {selectedKB && (
            <>
              <button
                onClick={createNewChat}
                className="btn-primary flex items-center space-x-2"
              >
                <BookOpen className="h-4 w-4" />
                <span>New Chat</span>
              </button>
              <button
                onClick={() => setShowChatHistory(!showChatHistory)}
                className="btn-secondary flex items-center space-x-2"
              >
                <BookOpen className="h-4 w-4" />
                <span>Chat History</span>
              </button>
            </>
          )}
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="input-field w-auto"
          >
            {voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} ({voice.provider})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat History Sidebar */}
        {showChatHistory && (
          <div className="lg:col-span-1">
            <div className="card h-[600px] flex flex-col">
              <div className="border-b border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900">Chat History</h3>
                <p className="text-sm text-gray-500">Previous conversations</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {chatSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No previous chats</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chatSessions.map((room) => (
                      <button
                        key={room.roomId}
                        onClick={() => loadChatSession(room.roomId)}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <h4 className="font-medium text-gray-900 text-sm mb-1">
                          {room.title}
                        </h4>
                        <p className="text-xs text-gray-500 mb-1">
                          {room.criteriaId?.name || 'Educational Criteria'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {room.messageCount} messages • {new Date(room.lastMessageAt).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className={showChatHistory ? "lg:col-span-3" : "lg:col-span-4"}>
          <div className="card h-[600px] flex flex-col">
            {/* Knowledge Base Selection */}
            {!selectedKB && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a Knowledge Base
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Choose a knowledge base to start your learning session
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    {knowledgeBases.map((kb) => (
                      <button
                        key={kb.id}
                        onClick={() => handleKBSelection(kb.id)}
                        className="card-hover text-left p-4"
                      >
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {kb.name}
                        </h4>
                        {/* <p className="text-sm text-gray-600 mb-2">
                          {kb.description || 'No description'}
                        </p>
                        <div className="text-xs text-gray-500">
                          {kb.fileCount} files • {kb.totalChunks} chunks
                        </div> */}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Interface */}
            {selectedKB && (
              <>
                {/* Chat Header */}
                <div className="border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedKBData?.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedKBData?.fileCount} files • {selectedKBData?.totalChunks} chunks
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedKB('');
                        setSessionId('');
                        setMessages([]);
                      }}
                      className="btn-secondary text-sm"
                    >
                      Change KB
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Start a conversation by typing a message or using voice input
                      </p>
                    </div>
                  )}
                  
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          {message.role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                          {message.isVoice && (
                            <span className="text-xs opacity-75">
                              {message.role === 'user' ? 'Voice' : 'Audio'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.responseTime && (
                          <p className="text-xs opacity-75 mt-1">
                            {message.responseTime}ms
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Bot className="h-4 w-4" />
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 p-4">
                  <form onSubmit={handleTextSubmit} className="flex space-x-3">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your question..."
                      className="input-field flex-1"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`p-3 rounded-lg transition-colors ${
                        isRecording
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                      disabled={isLoading}
                    >
                      {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isLoading || !inputMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                  
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      {isRecording ? 'Recording... Click to stop' : 'Click microphone to use voice input'}
                    </p>
                    {isPlaying && (
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Volume2 className="h-4 w-4" />
                        <span>Playing response...</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar - only show when chat history is not visible */}
        {!showChatHistory && (
          <div className="lg:col-span-1">
            <Sidebar messages={messages} selectedKB={selectedKBData} />
          </div>
        )}
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnd}
        className="hidden"
      />
    </div>
  );
};

export default TutorPage;
