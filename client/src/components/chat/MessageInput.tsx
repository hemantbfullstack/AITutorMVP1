import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Crown, AlertCircle } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  sessionId?: string | null;
}

export default function MessageInput({ onSendMessage, disabled, sessionId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

      {/* Session ID */}
      {sessionId && (
        <div className="mt-3 text-center">
          <div className="text-xs text-slate-500">
            Session: <span data-testid="text-session-id">{sessionId.slice(0, 8)}...</span>
          </div>
        </div>
      )}
    </div>
  );
}
