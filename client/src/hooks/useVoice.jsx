import { useState, useRef, useCallback } from 'react';

interface Voice {
  id: string;
  name: string;
  lang: string;
  default: boolean;
}

interface UseVoiceReturn {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, voice?: string) => void;
  stopSpeaking: () => void;
  getVoices: () => Voice[];
}

export const useVoice = (): UseVoiceReturn => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognitionRef.current.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    return true;
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      if (!initializeSpeechRecognition()) {
        return;
      }
    }
    
    setTranscript('');
    setError(null);
    recognitionRef.current.start();
  }, [initializeSpeechRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Speak text
  const speak = useCallback((text, voice = 'alloy') => {
    if (!('speechSynthesis' in window)) {
      setError('Speech synthesis not supported in this browser');
      return;
    }

    // Stop any ongoing speech
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to set voice (this might not work in all browsers)
    const voices = speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.name.toLowerCase().includes(voice.toLowerCase()));
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      setError(`Speech synthesis error: ${event.error}`);
      setIsSpeaking(false);
    };

    speechSynthesisRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (speechSynthesisRef.current) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Get available voices
  const getVoices = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      return [];
    }
    
    return speechSynthesis.getVoices().map(voice => ({
      id: voice.name,
      name: voice.name,
      lang: voice.lang,
      default: voice.default
    }));
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    getVoices
  };
};
