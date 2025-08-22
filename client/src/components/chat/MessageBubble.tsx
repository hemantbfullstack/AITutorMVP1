import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import "katex/dist/katex.min.css";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  image?: string; // data URL for inline images
  timestamp: string;
  isStreaming?: boolean;
}

export default function MessageBubble({ role, content, image, timestamp, isStreaming }: MessageBubbleProps) {
  // Debug logging
  if (image) {
    console.log("MessageBubble rendering with image:", image.substring(0, 50) + "...");
  }
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

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
      
      if (!audioUrl) {
        const response = await fetch("/api/voice/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ text: content }),
        });

        if (!response.ok) {
          throw new Error("TTS service unavailable");
        }

        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
        }
      } else {
        audioRef.current?.play();
      }
    } catch (error) {
      setIsPlaying(false);
      toast({
        title: "Voice unavailable",
        description: "Text-to-speech is temporarily unavailable",
        variant: "destructive",
      });
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
      <div className="flex items-start space-x-3 justify-end">
        <div className="bg-primary text-white rounded-lg px-4 py-3 max-w-2xl">
          <div className="text-white">
            {renderContent(content)}
          </div>
        </div>
        <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center flex-shrink-0">
          <i className="fas fa-user text-slate-600 text-sm"></i>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-3">
      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
        <i className="fas fa-robot text-white text-sm"></i>
      </div>
      <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-slate-200 max-w-2xl">
        <div className="text-slate-800 mb-3">
          <div className="space-y-3">
            {/* Always render the text content */}
            <div>{renderContent(content)}</div>
            
            {/* Render image if present */}
            {image && (
              <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
                <img 
                  src={image} 
                  alt="Generated visualization" 
                  className="max-w-full h-auto rounded border border-slate-300 bg-white"
                  style={{ 
                    maxWidth: "100%", 
                    maxHeight: "400px",
                    objectFit: "contain"
                  }}
                />
              </div>
            )}
          </div>
          {isStreaming && <span className="animate-pulse">|</span>}
        </div>

        {!isStreaming && (
          <div className="flex items-center space-x-2 text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayVoice}
              className="text-primary hover:text-blue-700 p-0 h-auto font-normal"
              data-testid="button-play-voice"
            >
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play-circle'} mr-1`}></i>
              {isPlaying ? 'Pause' : 'Play Voice'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyToClipboard}
              className="text-slate-500 hover:text-slate-700 p-0 h-auto font-normal"
              data-testid="button-copy"
            >
              <i className="fas fa-copy mr-1"></i>
              Copy
            </Button>
          </div>
        )}

        <audio 
          ref={audioRef}
          onEnded={handleAudioEnded}
          onError={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
