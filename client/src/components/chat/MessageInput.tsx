import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Crown, AlertCircle } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  sessionId?: string | null;
}

export default function MessageInput({ onSendMessage, disabled, sessionId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load preferences from localStorage
  useEffect(() => {
    const savedAutoPlay = localStorage.getItem('autoPlayVoice');
    if (savedAutoPlay !== null) {
      setAutoPlayVoice(savedAutoPlay === 'true');
    }

    const savedVolume = localStorage.getItem('volume');
    if (savedVolume !== null) {
      setVolume(parseFloat(savedVolume));
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  const charCount = message.length;
  const maxChars = 4000;
  const isOverLimit = charCount > maxChars;

  return (
    <div className="bg-white border-t border-slate-200 px-6 py-4">
      {disabled && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">
              You've reached your usage limit. 
              <button 
                onClick={() => window.location.href = '/pricing'}
                className="ml-1 underline hover:no-underline"
              >
                Upgrade your plan
              </button> 
              to continue chatting.
            </span>
          </div>
        </div>
      )}
      
      <div className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder="Ask your IB Math question here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`min-h-[48px] max-h-40 resize-none ${
              isOverLimit ? 'border-red-500 focus:border-red-500' : ''
            }`}
            disabled={disabled}
            data-testid="input-message"
          />
          <div className="absolute bottom-2 right-2 text-xs text-slate-400">
            <span className={isOverLimit ? 'text-red-500' : ''}>
              {charCount}/{maxChars}
            </span>
          </div>
        </div>
        <Button 
          onClick={handleSend}
          disabled={disabled || !message.trim() || isOverLimit}
          className="bg-primary hover:bg-blue-700 px-6"
          data-testid="button-send"
        >
          <i className="fas fa-paper-plane mr-2"></i>
          <span className="hidden sm:inline">Send</span>
        </Button>
      </div>

      {/* Voice Controls */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-play-voice"
              checked={autoPlayVoice}
              onCheckedChange={handleAutoPlayChange}
              data-testid="checkbox-autoplay"
            />
            <label htmlFor="auto-play-voice" className="text-slate-600 cursor-pointer">
              Auto-play tutor voice
            </label>
          </div>
          <div className="flex items-center space-x-2 text-slate-600">
            <i className="fas fa-volume-up"></i>
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
        {sessionId && (
          <div className="text-xs text-slate-500">
            Session: <span data-testid="text-session-id">{sessionId.slice(0, 8)}...</span>
          </div>
        )}
      </div>
    </div>
  );
}
