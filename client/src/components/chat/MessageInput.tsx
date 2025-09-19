import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Crown, AlertCircle, Camera, X, Upload } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string, image?: File) => void;
  disabled?: boolean;
  sessionId?: string | null;
}

export default function MessageInput({ onSendMessage, disabled, sessionId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if ((message.trim() || selectedImage) && !disabled) {
      onSendMessage(message.trim(), selectedImage || undefined);
      setMessage("");
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG)');
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image upload failed: Please use JPG/PNG under 2MB.');
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
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
      
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {selectedImage?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedImage?.size || 0 / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveImage}
              className="text-gray-500 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder="Ask your educational question here... (or upload an image)"
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
        
        {/* Image Upload Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleImageUploadClick}
          disabled={disabled || !!selectedImage}
          className="px-3 py-2"
          title="Upload Image (JPG/PNG, max 2MB)"
        >
          <Camera className="w-4 h-4" />
        </Button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleImageSelect}
          className="hidden"
        />

        <Button 
          onClick={handleSend}
          disabled={disabled || (!message.trim() && !selectedImage) || isOverLimit}
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
