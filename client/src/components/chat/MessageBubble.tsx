import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import "katex/dist/katex.min.css";
import { 
  Pause, 
  Play, 
  Copy
} from 'lucide-react';

// Utility function to split text into sentences for highlighting
const splitIntoSentences = (text: string): string[] => {
  // Split by sentence endings, but preserve LaTeX expressions
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  return sentences.filter(sentence => sentence.trim().length > 0);
};

// Calculate approximate timing for each sentence (words per minute = 150)
const calculateSentenceTiming = (sentences: string[]): number[] => {
  const wordsPerMinute = 150;
  const wordsPerSecond = wordsPerMinute / 60;
  
  return sentences.map(sentence => {
    const wordCount = sentence.trim().split(/\s+/).length;
    return Math.max(wordCount / wordsPerSecond * 1000, 1000); // Minimum 1 second per sentence
  });
};

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  image?: string;
  wolframImage?: string;
  wolframInterpretation?: string;
  wolframGenerated?: boolean;
  timestamp?: string;
  isStreaming?: boolean;
  selectedVoiceId?: string;
  autoPlayVoice?: boolean;
  volume?: number;
}

export default function MessageBubble({ 
  role, 
  content, 
  image, 
  wolframImage,
  wolframInterpretation,
  wolframGenerated,
  timestamp, 
  isStreaming,
  selectedVoiceId,
  autoPlayVoice = false,
  volume = 0.7
}: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentHighlightedSentence, setCurrentHighlightedSentence] = useState<number>(-1);
  const [sentences, setSentences] = useState<string[]>([]);
  const [sentenceTimings, setSentenceTimings] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Create cache key for this specific text + voice combination
  const cacheKey = useMemo(() => {
    return `${selectedVoiceId}-${content.substring(0, 100)}`; // First 100 chars for cache key
  }, [selectedVoiceId, content]);

  // Initialize sentences and timings when content changes
  useEffect(() => {
    if (content && role === "assistant") {
      const contentSentences = splitIntoSentences(content);
      const timings = calculateSentenceTiming(contentSentences);
      setSentences(contentSentences);
      setSentenceTimings(timings);
      setCurrentHighlightedSentence(-1);
    }
  }, [content, role]);

  // Reset audio when voice changes
  useEffect(() => {
    if (audioUrl) {
      setAudioUrl(null);
      setIsPlaying(false);
    }
    // Clear cache when voice changes to avoid mixing voices
    sessionStorage.removeItem(cacheKey);
  }, [selectedVoiceId, cacheKey]);

  // Auto-play functionality
  useEffect(() => {
    if (autoPlayVoice && role === "assistant" && !isStreaming && content && !isPlaying && !audioUrl) {
      // Small delay to ensure message is fully rendered
      const timer = setTimeout(() => {
        handlePlayVoice();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlayVoice, role, isStreaming, content, isPlaying, audioUrl]);

  // Set volume when audio is loaded
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, audioUrl]);

  // Start sentence highlighting sequence
  const startSentenceHighlighting = () => {
    if (sentences.length === 0) return;
    
    setCurrentHighlightedSentence(0);
    let currentIndex = 0;
    
    const highlightNextSentence = () => {
      if (currentIndex < sentences.length - 1) {
        currentIndex++;
        setCurrentHighlightedSentence(currentIndex);
        highlightTimeoutRef.current = setTimeout(highlightNextSentence, sentenceTimings[currentIndex]);
      } else {
        // All sentences highlighted, clear after a short delay
        setTimeout(() => setCurrentHighlightedSentence(-1), 1000);
      }
    };
    
    // Start highlighting after first sentence timing
    highlightTimeoutRef.current = setTimeout(highlightNextSentence, sentenceTimings[0]);
  };

  // Stop sentence highlighting
  const stopSentenceHighlighting = () => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    setCurrentHighlightedSentence(-1);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Render LaTeX content with sentence highlighting
  const renderContent = (text: string) => {
    // If we have sentences and highlighting is active, render with highlighting
    if (sentences.length > 0 && currentHighlightedSentence >= 0) {
      return sentences.map((sentence, sentenceIndex) => {
        const isHighlighted = sentenceIndex === currentHighlightedSentence;
        const isPastHighlighted = sentenceIndex < currentHighlightedSentence;
        
        return (
          <span
            key={sentenceIndex}
            className={`transition-all duration-300 ${
              isHighlighted 
                ? 'bg-yellow-200 text-gray-900 px-1 py-0.5 rounded-md shadow-sm' 
                : isPastHighlighted 
                  ? 'text-gray-600' 
                  : 'text-gray-800'
            }`}
          >
            {renderLaTeXContent(sentence)}
            {sentenceIndex < sentences.length - 1 && ' '}
          </span>
        );
      });
    }
    
    // Fallback to regular LaTeX rendering
    return renderLaTeXContent(text);
  };

  // Render LaTeX content (extracted from original renderContent)
  const renderLaTeXContent = (text: string) => {
    // Simple LaTeX rendering - split by $ and $$ delimiters
    const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Block math
        const math = part.slice(2, -2);
        return (
          <div key={index} className="my-3 text-center">
            <span className="inline-block bg-slate-50 px-4 py-2 rounded-md font-mono text-sm">
              {math}
            </span>
          </div>
        );
      } else if (part.startsWith('$') && part.endsWith('$')) {
        // Inline math
        const math = part.slice(1, -1);
        return (
          <span key={index} className="bg-slate-100 px-1 py-0.5 rounded font-mono text-sm">
            {math}
          </span>
        );
      } else {
        // Regular text with line breaks
        return part.split('\n').map((line, lineIndex) => (
          <span key={`${index}-${lineIndex}`}>
            {line}
            {lineIndex < part.split('\n').length - 1 && <br />}
          </span>
        ));
      }
    });
  };

  const handlePlayVoice = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      stopSentenceHighlighting();
      return;
    }

    try {
      setIsPlaying(true);
      setIsLoading(true);
      
      // Check cache first when user clicks play
      const cachedAudio = sessionStorage.getItem(cacheKey);
      if (cachedAudio) {
        setAudioUrl(cachedAudio);
        if (audioRef.current) {
          audioRef.current.src = cachedAudio;
          audioRef.current.play();
          // Start highlighting when audio starts playing
          startSentenceHighlighting();
        }
        setIsLoading(false);
        return;
      }

      // Only make TTS API call if not cached and user explicitly clicked play
      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ 
          text: content,
          voice: selectedVoiceId, // This should now be "alloy", "echo", etc.
          model: "tts-1", // OpenAI TTS model
          format: "mp3" // Output format
        }),
      });

      if (!response.ok) {
        throw new Error("TTS service unavailable");
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      
      // Cache the audio URL for future use
      sessionStorage.setItem(cacheKey, url);
      setAudioUrl(url);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        // Start highlighting when audio starts playing
        startSentenceHighlighting();
      }
    } catch (error) {
      setIsPlaying(false);
      stopSentenceHighlighting();
      toast({
        title: "Voice unavailable",
        description: "Text-to-speech is temporarily unavailable",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied to clipboard",
        description: "Message content copied successfully",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    stopSentenceHighlighting();
  };

  if (role === "user") {
    return (
      <div className="flex gap-3 mb-6 justify-end">
        <div className="flex-1 max-w-3xl">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-4 shadow-lg">
            {image && (
              <div className="mb-3">
                <img 
                  src={image} 
                  alt="Uploaded image" 
                  className="max-w-full rounded-lg border border-white/20"
                />
              </div>
            )}
            <div className="text-sm leading-relaxed">
              {renderContent(content)}
            </div>
          </div>
          {timestamp && (
            <div className="text-xs text-gray-500 mt-2 text-right font-medium">{timestamp}</div>
          )}
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-lg">
          You
        </div>
      </div>
    );
  }

  if (role === "assistant" || role === "system") {
    return (
      <div className="flex gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-semibold shadow-lg">
          AI
        </div>
        
        <div className="flex-1 max-w-3xl space-y-2">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-4 shadow-md">
            {image && (
              <div className="mb-3">
                <img 
                  src={image} 
                  alt="User uploaded image" 
                  className="max-w-full rounded-lg border border-gray-200"
                />
              </div>
            )}
            
            {wolframImage && (
              <div className="mb-3">
                <div className="relative">
                  <img 
                    src={wolframImage} 
                    alt="Wolfram generated visualization" 
                    className="max-w-full rounded-lg border border-blue-200"
                  />
                  {wolframGenerated && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Generated by Wolfram
                    </div>
                  )}
                </div>
                {wolframInterpretation && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium mb-1">Wolfram Analysis:</p>
                    <p className="text-sm text-blue-700">{wolframInterpretation}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="prose prose-sm max-w-none">
              {isStreaming ? (
                <div className="text-gray-800 text-sm leading-relaxed">
                  {content}
                  <span className="animate-pulse text-green-600">▊</span>
                </div>
              ) : (
                renderContent(content)
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
                         <Button
               variant="outline"
               size="sm"
               onClick={handlePlayVoice}
               disabled={isLoading || isStreaming}
               className="flex items-center gap-2"
             >
                             {isLoading ? (
                 <>
                   <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                   Loading...
                 </>
               ) : isPlaying ? (
                 <>
                   <Pause className="w-4 h-4" />
                   Pause
                 </>
               ) : isStreaming ? (
                 <>
                   <Play className="w-4 h-4" />
                   Wait for completion...
                 </>
               ) : (
                 <>
                   <Play className="w-4 h-4" />
                   Play Voice
                 </>
               )}
            </Button>
            
            {/* Copy button */}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyToClipboard}
              className="text-gray-500 hover:text-gray-700"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          
          {timestamp && (
            <div className="text-xs text-gray-600 font-medium">{timestamp}</div>
          )}
        </div>
        
        <audio
          ref={audioRef}
          onEnded={handleAudioEnded}
          onError={() => setIsPlaying(false)}
          volume={volume}
        />
      </div>
    );
  }

  return null;
}
