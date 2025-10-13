import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { Pause, Play, Copy } from "lucide-react";

// Utility function to split text into words while preserving text structure
const splitIntoWords = (text: string): { word: string; startIndex: number; endIndex: number }[] => {
  const words: { word: string; startIndex: number; endIndex: number }[] = [];
  const wordRegex = /\b\w+\b/g;
  let match;
  
  while ((match = wordRegex.exec(text)) !== null) {
    words.push({
      word: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  return words;
};

// Utility function to split text into sentences for fallback
const splitIntoSentences = (text: string): string[] => {
  // Split by sentence endings, but preserve LaTeX expressions
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  return sentences.filter((sentence) => sentence.trim().length > 0);
};

// Utility function to format date as "time ago"
const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - messageTime.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
};

// Calculate approximate timing for each word (words per minute = 150)
const calculateWordTiming = (words: { word: string; startIndex: number; endIndex: number }[]): number[] => {
  const wordsPerMinute = 150;
  const wordsPerSecond = wordsPerMinute / 60;
  const baseWordDuration = (1 / wordsPerSecond) * 1000; // Base duration per word in ms

  return words.map((wordData) => {
    const word = wordData.word;
    // Different timing based on word length
    if (word.length > 8) {
      return baseWordDuration * 1.3; // Longer words get more time
    } else if (word.length > 4) {
      return baseWordDuration * 1.1; // Medium words get slightly more time
    } else {
      return baseWordDuration; // Short words get standard duration
    }
  });
};

// Calculate approximate timing for each sentence (words per minute = 150) - fallback
const calculateSentenceTiming = (sentences: string[]): number[] => {
  const wordsPerMinute = 150;
  const wordsPerSecond = wordsPerMinute / 60;

  return sentences.map((sentence) => {
    const wordCount = sentence.trim().split(/\s+/).length;
    return Math.max((wordCount / wordsPerSecond) * 1000, 1000); // Minimum 1 second per sentence
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
  volume = 0.7,
}: MessageBubbleProps) {
  // MathJax configuration
  const mathJaxConfig = {
    tex: {
      inlineMath: [["\\(", "\\)"]],
      displayMath: [["\\[", "\\]"]],
      processEscapes: true,
      processEnvironments: true,
    },
    options: {
      skipHtmlTags: ["script", "noscript", "style", "textarea", "pre"],
    },
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentHighlightedWord, setCurrentHighlightedWord] = useState<number>(-1);
  const [words, setWords] = useState<{ word: string; startIndex: number; endIndex: number }[]>([]);
  const [wordTimings, setWordTimings] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Create cache key for this specific text + voice combination
  const cacheKey = useMemo(() => {
    return `${selectedVoiceId}-${content.substring(0, 100)}`; // First 100 chars for cache key
  }, [selectedVoiceId, content]);

  // Initialize words and timings when content changes
  useEffect(() => {
    if (content && role === "assistant") {
      const contentWords = splitIntoWords(content);
      const timings = calculateWordTiming(contentWords);
      setWords(contentWords);
      setWordTimings(timings);
      setCurrentHighlightedWord(-1);
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
    if (
      autoPlayVoice &&
      role === "assistant" &&
      !isStreaming &&
      content &&
      !isPlaying &&
      !audioUrl
    ) {
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

  // Start word highlighting sequence
  const startWordHighlighting = () => {
    if (words.length === 0) return;

    console.log("Starting word highlighting with", words.length, "words");
    setCurrentHighlightedWord(0);
    let currentIndex = 0;

    const highlightNextWord = () => {
      if (currentIndex < words.length - 1) {
        currentIndex++;
        setCurrentHighlightedWord(currentIndex);
        console.log(`Highlighting word ${currentIndex}: "${words[currentIndex].word}" at position ${words[currentIndex].startIndex}-${words[currentIndex].endIndex}`);
        highlightTimeoutRef.current = setTimeout(
          highlightNextWord,
          wordTimings[currentIndex]
        );
      } else {
        // All words highlighted, clear after a short delay
        console.log("All words highlighted, clearing in 500ms");
        setTimeout(() => setCurrentHighlightedWord(-1), 500);
      }
    };

    // Start highlighting after first word timing
    console.log(`Starting highlighting in ${wordTimings[0]}ms for word: "${words[0].word}" at position ${words[0].startIndex}-${words[0].endIndex}`);
    highlightTimeoutRef.current = setTimeout(
      highlightNextWord,
      wordTimings[0]
    );
  };


  // Stop word highlighting
  const stopWordHighlighting = () => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    setCurrentHighlightedWord(-1);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Render LaTeX content with word highlighting
  const renderContent = (text: string) => {
    // Always render the full text normally - no highlighting for now
    return renderLaTeXContent(text);
  };

  // Render LaTeX content with MathJax
  const renderLaTeXContent = (text: string) => {
    // MathJax can handle LaTeX directly, so we just need to wrap it
    return (
      <MathJax>
        <div dangerouslySetInnerHTML={{ __html: text }} />
      </MathJax>
    );
  };

  const handlePlayVoice = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      stopWordHighlighting();
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
          startWordHighlighting();
        }
        setIsLoading(false);
        return;
      }

      // Only make TTS API call if not cached and user explicitly clicked play
      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          text: content,
          voice: selectedVoiceId, // This should now be "alloy", "echo", etc.
          model: "tts-1", // OpenAI TTS model
          format: "mp3", // Output format
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
        startWordHighlighting();
      }
    } catch (error) {
      setIsPlaying(false);
      stopWordHighlighting();
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
    stopWordHighlighting();
  };

  if (role === "user") {
    return (
      <MathJaxContext config={mathJaxConfig}>
        <div className="flex gap-3 py-3 justify-end">
          <div className="flex-1 max-w-3xl">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 rounded-2xl p-4 shadow-lg relative backdrop-blur-sm">
              {image && (
                <div className="mb-4">
                  <img
                    src={image}
                    alt="Uploaded image"
                    className="max-w-full rounded-xl border border-blue-200/60 shadow-sm"
                  />
                </div>
              )}
               <div className="text-sm leading-relaxed text-slate-800 font-medium">
                 {renderContent(content)}
               </div>
               {timestamp && (
                 <div className="absolute top-3 right-4 text-xs text-slate-500 font-semibold bg-white/80 px-2 py-1 rounded-full">
                   {formatTimeAgo(timestamp)}
                 </div>
               )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-xl flex-shrink-0">
            You
          </div>
        </div>
      </MathJaxContext>
    );
  }

  if (role === "assistant" || role === "system") {
    return (
      <MathJaxContext config={mathJaxConfig}>
        <div className="flex gap-3 py-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-xl flex-shrink-0">
            AI
          </div>

          <div className="flex-1 max-w-3xl space-y-3">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200/60 rounded-2xl p-4 shadow-lg relative backdrop-blur-sm">
              {image && (
                <div className="mb-4">
                  <img
                    src={image}
                    alt="User uploaded image"
                    className="max-w-full rounded-xl border border-emerald-200/60 shadow-sm"
                  />
                </div>
              )}

              {wolframImage && (
                <div className="mb-4">
                  <div className="relative">
                    <img
                      src={wolframImage}
                      alt="Wolfram generated visualization"
                      className="max-w-full rounded-xl border border-blue-200/60 shadow-sm"
                    />
                    {wolframGenerated && (
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                        Generated by Wolfram
                      </div>
                    )}
                  </div>
                  {wolframInterpretation && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl shadow-sm">
                      <p className="text-sm text-blue-800 font-semibold mb-2">
                        Wolfram Analysis:
                      </p>
                      <p className="text-sm text-blue-700 leading-relaxed">
                        {wolframInterpretation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="prose prose-sm max-w-none">
                {isStreaming ? (
                  <div className="text-slate-800 text-sm leading-relaxed font-medium">
                    {content}
                    <span className="animate-pulse text-emerald-600 font-bold">
                      ▊
                    </span>
                  </div>
                ) : (
                  renderContent(content)
                )}
              </div>

               {timestamp && (
                 <div className="absolute top-3 right-4 text-xs text-slate-500 font-semibold bg-white/80 px-2 py-1 rounded-full">
                   {formatTimeAgo(timestamp)}
                 </div>
               )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayVoice}
                disabled={isLoading || isStreaming}
                className="flex items-center gap-2 bg-white/80 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 text-emerald-700 hover:text-emerald-800 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <audio
            ref={audioRef}
            onEnded={handleAudioEnded}
            onError={() => setIsPlaying(false)}
          />
        </div>
      </MathJaxContext>
    );
  }

  return null;
}
