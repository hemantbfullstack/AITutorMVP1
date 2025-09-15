import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoicePreviewProps {
  voiceId: string;
  tutorName: string;
  className?: string;
}

export default function VoicePreview({ voiceId, tutorName, className }: VoicePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const previewText = `Hello! I'm ${tutorName}, your AI tutor. I'm here to help you learn and grow.`;

  const handlePreview = async () => {
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
            "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({ 
            text: previewText,
            voice: voiceId, // This should now be "alloy", "echo", etc.
            model: "tts-1", // OpenAI TTS model
            format: "mp3" // Output format
          }),
        });

        if (!response.ok) {
          throw new Error("Preview unavailable");
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
      console.error("Preview error:", error);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePreview}
        disabled={isPlaying}
        className="h-8 w-8 p-0 hover:bg-blue-50 transition-all duration-200 hover:scale-110"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>
      
      {isPlaying && (
        <div className="ml-2 text-xs text-blue-600 animate-pulse">
          Loading...
        </div>
      )}
      
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />
    </div>
  );
}
