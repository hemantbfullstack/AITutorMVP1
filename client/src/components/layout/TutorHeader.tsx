import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare,
  LogOut,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Settings,
  Crown,
  User,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface TutorHeaderProps {
  selectedVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
  autoPlayVoice: boolean;
  onToggleAutoPlay: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  userCredits?: number;
}

const voiceOptions = [
  { id: "alloy", name: "Alloy", description: "Neutral, balanced" },
  { id: "echo", name: "Echo", description: "Clear, confident" },
  { id: "fable", name: "Fable", description: "Warm, storytelling" },
  { id: "onyx", name: "Onyx", description: "Deep, authoritative" },
  { id: "nova", name: "Nova", description: "Bright, energetic" },
  { id: "shimmer", name: "Shimmer", description: "Soft, gentle" },
];

export default function TutorHeader({
  selectedVoiceId,
  onVoiceChange,
  autoPlayVoice,
  onToggleAutoPlay,
  volume,
  onVolumeChange,
  userCredits = 0,
}: TutorHeaderProps) {
  const { user, logout } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const selectedVoice =
    voiceOptions.find((v) => v.id === selectedVoiceId) || voiceOptions[0];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200/60 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Maths- AA SL and HL - 08/10/2025
                </h1>
                <p className="text-sm text-slate-500">Educational Assistant</p>
              </div>
            </div>
          </div>

          {/* Right Section - Voice Controls (moved from center) */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4 bg-slate-50 rounded-lg px-4 py-2 border border-slate-200">
              <span className="text-sm font-medium text-slate-700">Voice:</span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 px-3 space-x-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {selectedVoice.name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {selectedVoice.name}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56">
                  {voiceOptions.map((voice) => (
                    <DropdownMenuItem
                      key={voice.id}
                      onClick={() => onVoiceChange(voice.id)}
                      className="flex items-center space-x-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {voice.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{voice.name}</div>
                        <div className="text-xs text-slate-500">
                          {voice.description}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-slate-600" />
                <div className="w-20 h-1 bg-slate-200 rounded-full relative">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-200"
                    style={{ width: `${volume * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant={autoPlayVoice ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleAutoPlay}
                  className="h-8 px-3 space-x-1"
                >
                  {autoPlayVoice ? (
                    <Pause className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  <span className="text-xs font-medium">Auto-play</span>
                </Button>
              </div>
            </div>

            {/* User Profile and Credits (moved from separate section) */}
            {/* <div className="flex items-center space-x-4"> */}
            {/* Credits Badge */}
            {/* <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg px-3 py-2 border border-amber-200">
                <Crown className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">
                  {userCredits}
                </span>
              </div> */}

            {/* User Profile Dropdown */}
            {/* <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 px-3 space-x-3 hover:bg-slate-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-slate-900">
                        {user?.firstName || user?.email || "User"}
                      </div>
                      <div className="text-xs text-slate-500">Free Plan</div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu> */}
            {/* </div> */}
          </div>
        </div>
      </div>
    </header>
  );
}
