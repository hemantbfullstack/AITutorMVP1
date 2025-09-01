import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import "katex/dist/katex.min.css";
import { 
  Pause, 
  Play, 
  Copy
} from 'lucide-react';

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  image?: string;
  timestamp?: string;
  isStreaming?: boolean;
  selectedVoiceId?: string;
}

export default function MessageBubble({ 
  role, 
  content, 
  image, 
  timestamp, 
  isStreaming,
  selectedVoiceId
}: MessageBubbleProps) {
  // Debug logging
  if (image) {
    console.log("MessageBubble rendering with image:", image.substring(0, 50) + "...");
  }
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Create cache key for this specific text + voice combination
  const cacheKey = useMemo(() => {
    return `${selectedVoiceId}-${content.substring(0, 100)}`; // First 100 chars for cache key
  }, [selectedVoiceId, content]);





  // Reset audio when voice changes
  useEffect(() => {
    if (audioUrl) {
      setAudioUrl(null);
      setIsPlaying(false);
    }
    // Clear cache when voice changes to avoid mixing voices
    sessionStorage.removeItem(cacheKey);
  }, [selectedVoiceId, cacheKey]);

  // Render LaTeX content
  const renderContent = (text: string) => {
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
        }
        setIsLoading(false);
        return;
      }

      // Only make TTS API call if not cached and user explicitly clicked play
      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
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
      }
    } catch (error) {
      setIsPlaying(false);
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
  };

  if (role === "user") {
    return (
      <div className="flex gap-3 mb-6 justify-end">
        <div className="flex-1 max-w-3xl">
          <div className="bg-blue-500 text-white rounded-lg p-4">
            {renderContent(content)}
          </div>
          {timestamp && (
            <div className="text-xs text-gray-500 mt-2 text-right">{timestamp}</div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
          You
        </div>
      </div>
    );
  }

  if (role === "assistant" || role === "system") {
    return (
      <div className="flex gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium">
          AI
        </div>
        
        <div className="flex-1 max-w-3xl space-y-2">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            {image && (
              <div className="mb-3">
                <img 
                  src={image} 
                  alt="Generated content" 
                  className="max-w-full rounded-lg"
                />
              </div>
            )}
            
            <div className="prose prose-sm max-w-none">
              {isStreaming ? (
                <div className="text-gray-700">
                  {content}
                  <span className="animate-pulse">▊</span>
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
            <div className="text-xs text-gray-500">{timestamp}</div>
          )}
        </div>
        
        <audio
          ref={audioRef}
          onEnded={handleAudioEnded}
          onError={() => setIsPlaying(false)}
        />
      </div>
    );
  }

  return null;
}
