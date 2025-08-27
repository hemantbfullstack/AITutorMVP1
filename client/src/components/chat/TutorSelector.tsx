import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Volume2, 
  GraduationCap, 
  Sparkles,
  CheckCircle,
  X
} from 'lucide-react';
import VoicePreview from './VoicePreview';

interface TutorVoice {
  voice_id: string;
  name: string;
  labels: {
    accent: string;
    descriptive: string;
    age: string;
    gender: string;
    language: string;
    use_case: string;
  };
}

const tutorVoices: TutorVoice[] = [
  {
    "voice_id": "21m00Tcm4TlvDq8ikWAM",
    "name": "Rachel",
    "labels": {
      "accent": "american",
      "descriptive": "casual",
      "age": "young",
      "gender": "female",
      "language": "en",
      "use_case": "conversational"
    },
  },
  {
    "voice_id": "2EiwWnXFnvU5JabPnv8n",
    "name": "Clyde",
    "labels": {
      "accent": "american",
      "descriptive": "intense",
      "age": "middle_aged",
      "gender": "male",
      "language": "en",
      "use_case": "characters_animation"
    }
  },
  {
    "voice_id": "CwhRBWXzGAHq8TQ4Fs17",
    "name": "Roger",
    "labels": {
      "accent": "american",
      "descriptive": "classy",
      "age": "middle_aged",
      "gender": "male",
      "language": "en",
      "use_case": "conversational"
    },
  },
  {
    "voice_id": "EXAVITQu4vr4xnSDxMaL",
    "name": "Sarah",
    "labels": {
      "accent": "american",
      "descriptive": "professional",
      "age": "young",
      "gender": "female",
      "language": "en",
      "use_case": "entertainment_tv"
    },
  }
];

interface TutorSelectorProps {
  selectedVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
  className?: string;
}

export default function TutorSelector({ selectedVoiceId, onVoiceChange, className }: TutorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getTutorImage = (tutor: TutorVoice) => {
    const { gender, age, descriptive } = tutor.labels;
    
    if (gender === 'female') {
      if (age === 'young') {
        return '👩‍🎓';
      } else {
        return '👩‍🏫';
      }
    } else {
      if (age === 'young') {
        return '👨‍🎓';
      } else {
        return '👨‍🏫';
      }
    }
  };

  const getTutorStyle = (tutor: TutorVoice) => {
    const { descriptive } = tutor.labels;
    
    switch (descriptive) {
      case 'casual':
        return 'bg-gradient-to-br from-blue-500 to-purple-600';
      case 'intense':
        return 'bg-gradient-to-br from-red-600 to-orange-600';
      case 'classy':
        return 'bg-gradient-to-br from-emerald-600 to-teal-600';
      case 'professional':
        return 'bg-gradient-to-br from-indigo-600 to-blue-700';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-700';
    }
  };

  const getTutorDescription = (tutor: TutorVoice) => {
    const { descriptive, age, accent } = tutor.labels;
    
    const descriptions: Record<string, string> = {
      'casual': 'Friendly and approachable',
      'intense': 'Energetic and passionate',
      'classy': 'Sophisticated and refined',
      'professional': 'Clear and authoritative'
    };
    
    const description = descriptions[descriptive] || 'Professional';
    return `${description} ${age.replace('_', ' ')} ${accent} tutor`;
  };

  const selectedTutor = tutorVoices.find(t => t.voice_id === selectedVoiceId) || tutorVoices[0];

  return (
    <div className={`relative ${className}`}>
      {/* Current Tutor Display */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 h-auto hover:bg-gray-50 transition-all duration-200 hover:scale-105"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-lg ${getTutorStyle(selectedTutor)} animate-pulse`}>
          {getTutorImage(selectedTutor)}
        </div>
        <div className="text-left">
          <div className="font-medium text-sm transition-all duration-200 hover:text-blue-600">{selectedTutor.name}</div>
        </div>
        <Volume2 className="w-4 h-4 ml-2 transition-all duration-200 hover:scale-110" />
      </Button>

      {/* Facebook-style Popup */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-in fade-in-0 duration-300"
          onClick={() => setIsOpen(false)}
        >
          <div 
            ref={popupRef}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out scale-100 animate-in fade-in-0 zoom-in-95 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-900 transition-all duration-200">Choose Your Tutor</h3>
                  <p className="text-sm text-gray-500 transition-all duration-200 hover:text-gray-600">Select who will guide your learning</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 p-0 hover:bg-gray-100 transition-all duration-200 hover:scale-110"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Tutor Options */}
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
              {tutorVoices.map((tutor) => (
                <div
                  key={tutor.voice_id}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ease-out hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 ${
                    selectedVoiceId === tutor.voice_id 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  onClick={() => {
                    onVoiceChange(tutor.voice_id);
                    setIsOpen(false);
                  }}
                >
                  {/* Selection indicator */}
                  {selectedVoiceId === tutor.voice_id && (
                    <div className="absolute top-3 right-3 animate-bounce">
                      <CheckCircle className="w-6 h-6 text-blue-500" />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl ${getTutorStyle(tutor)} transition-all duration-200 hover:scale-110`}>
                      {getTutorImage(tutor)}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-lg text-gray-900 transition-all duration-200 hover:text-blue-600">{tutor.name}</h4>
                        {selectedVoiceId === tutor.voice_id && (
                          <Badge variant="default" className="bg-blue-500 text-white animate-pulse">
                            Current
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed transition-all duration-200 hover:text-gray-800">
                        {getTutorDescription(tutor)}
                      </p>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs px-2 py-1 transition-all duration-200 hover:scale-105">
                          {tutor.labels.accent}
                        </Badge>
                        <Badge variant="secondary" className="text-xs px-2 py-1 transition-all duration-200 hover:scale-105">
                          {tutor.labels.descriptive}
                        </Badge>
                        <Badge variant="secondary" className="text-xs px-2 py-1 transition-all duration-200 hover:scale-105">
                          {tutor.labels.use_case.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Voice Preview */}
                      <div className="mt-2">
                        <VoicePreview 
                          voiceId={tutor.voice_id} 
                          tutorName={tutor.name}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3 transition-all duration-200 hover:text-gray-700">
                  Your tutor's voice will be used for all text-to-speech responses
                </p>
                <Button
                  onClick={() => setIsOpen(false)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 hover:scale-105"
                >
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}