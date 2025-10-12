import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageSquare,
  Search,
  Filter,
  Archive,
  Trash2,
  Settings,
  BookOpen,
  GraduationCap,
  Users,
  Clock,
  MoreHorizontal,
  RefreshCw,
  Plus,
  Sparkles,
  Volume2,
  Play,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Home,
  Wrench,
  Zap,
  MessageCircle,
  FileText,
  History,
  Star,
  Folder,
  Settings2,
  Mic,
  MicOff,
  VolumeX,
  Volume1,
  Volume2 as Volume2Icon,
  HelpCircle,
  Info,
} from "lucide-react";
import { ChatRoom } from "@/types/chat";
import { useChatRooms } from "@/hooks/useChatRooms";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Hardcoded criteria mapping
const CRITERIA_MAPPING: { [key: string]: string } = {
  "math-aa-sl": "AA SL",
  "math-aa-hl": "AA HL", 
  "math-ai-sl": "AI SL",
  "math-ai-hl": "AI HL",
};

// Function to get criteria level from criteriaId
const getCriteriaLevel = (criteriaId?: string): string => {
  if (!criteriaId) return "General";
  return CRITERIA_MAPPING[criteriaId] || "Educational";
};

interface ModernSidebarProps {
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  onNewChat: () => void;
  onToggleTools: () => void;
  onToggleAutoPlay: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void;
  isCreatingNewChat?: boolean;
  className?: string;
}

export default function ModernSidebar({
  selectedRoomId,
  onRoomSelect,
  onNewChat,
  onToggleTools,
  onToggleAutoPlay,
  isCollapsed,
  onToggleCollapse,
  onClose,
  isCreatingNewChat = false,
  className = "",
}: ModernSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("chat-rooms");
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    "chat-rooms": false,
    "available-rooms": false,
    tools: false,
    settings: false,
    voice: false,
  });

  const { rooms, loading, deleteRoom, archiveRoom, loadRooms } = useChatRooms();
  const { toast } = useToast();
  const { user, logout } = useAuth();

  // Filter rooms based on search and type
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || room.type === filterType;
    return matchesSearch && matchesType && room.isActive;
  });

  // Handle room deletion
  const handleDeleteRoom = async (roomId: string, roomTitle: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${roomTitle}"? This action cannot be undone.`
      )
    ) {
      const success = await deleteRoom(roomId);
      if (success && selectedRoomId === roomId) {
        onRoomSelect("");
      }
    }
  };

  // Handle room archiving
  const handleArchiveRoom = async (roomId: string, roomTitle: string) => {
    if (window.confirm(`Are you sure you want to archive "${roomTitle}"?`)) {
      await archiveRoom(roomId);
      if (selectedRoomId === roomId) {
        onRoomSelect("");
      }
    }
  };

  // Get room type icon
  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case "educational-criteria":
        return <BookOpen className="w-4 h-4" />;
      case "ib-tutor":
        return <GraduationCap className="w-4 h-4" />;
      case "general":
        return <Users className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Get room type color
  const getRoomTypeColor = (type: string) => {
    switch (type) {
      case "educational-criteria":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "ib-tutor":
        return "bg-green-100 text-green-700 border-green-200";
      case "general":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Format last message time
  const formatLastMessageTime = (lastMessageAt: string) => {
    const date = new Date(lastMessageAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleLogout = () => {
    logout();
  };

  const toggleMenu = (menuKey: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  if (isCollapsed) {
    return (
      <div
        className={`w-16 bg-gray-100 border-r border-gray-200 flex flex-col items-center py-4 space-y-4 ${className}`}
      >
        {/* App Logo */}
        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 shadow-sm">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>

        {/* Tab Icons */}
        <div className="flex flex-col space-y-2">
          <Button
            variant={activeTab === "chat-rooms" ? "default" : "ghost"}
            size="sm"
            className="w-10 h-10 p-0"
            onClick={() => setActiveTab("chat-rooms")}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTab === "tools" ? "default" : "ghost"}
            size="sm"
            className="w-10 h-10 p-0"
            onClick={() => setActiveTab("tools")}
          >
            <Wrench className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTab === "auto-play" ? "default" : "ghost"}
            size="sm"
            className="w-10 h-10 p-0"
            onClick={() => setActiveTab("auto-play")}
          >
            <Play className="w-4 h-4" />
          </Button>
        </div>

        {/* New Chat Button */}
        <Button
          onClick={onNewChat}
          className="w-10 h-10 p-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Plus className="w-4 h-4" />
        </Button>

        {/* User Info */}
        <div className="mt-auto">
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Expand Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-10 h-10 p-0"
          onClick={onToggleCollapse}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`w-80 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200/60 flex flex-col h-full shadow-xl ${className}`}
      style={{
        borderRight: "1px solid rgba(148, 163, 184, 0.3)",
        boxShadow:
          "4px 0 6px -1px rgba(0, 0, 0, 0.1), 2px 0 4px -1px rgba(0, 0, 0, 0.06)",
      }}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">AI Tutor</h1>
              <p className="text-sm text-slate-500 font-medium">
                Educational Assistant
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Mobile Close Button */}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="w-8 h-8 p-0 lg:hidden"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            {/* Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="w-8 h-8 p-0 hidden lg:flex"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Menu Navigation */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {/* Chat Rooms Menu */}
          <Collapsible
            open={openMenus["chat-rooms"]}
            onOpenChange={() => toggleMenu("chat-rooms")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto rounded-xl hover:bg-slate-100/80 transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-slate-800">
                    Chat Rooms
                  </span>
                </div>
                {openMenus["chat-rooms"] ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 ml-4">
              {/* Actions */}
              <div className="space-y-1">
                <Button
                  onClick={onNewChat}
                  className="w-full justify-start"
                  variant="ghost"
                  size="sm"
                  disabled={isCreatingNewChat}
                >
                  {isCreatingNewChat ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      New Chat
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => loadRooms()}
                  className="w-full justify-start"
                  variant="ghost"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Rooms
                </Button>
              </div>

              {/* Available Rooms Sub-menu */}
              <Collapsible
                open={openMenus["available-rooms"]}
                onOpenChange={() => toggleMenu("available-rooms")}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Available Rooms
                    <span className="ml-2 px-2 py-0.5 bg-slate-200 text-xs font-medium text-slate-600 rounded-full">
                      {filteredRooms.length}
                    </span>
                    {openMenus["available-rooms"] ? (
                      <ChevronUp className="w-4 h-4 ml-auto" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 ml-4">
                  {/* Search and Filter */}
                  <div className="space-y-3 pt-3 border-t border-slate-200/60">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        placeholder="Search rooms..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-9 text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4 text-slate-400" />
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full h-9 text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="educational-criteria">
                            Educational Criteria
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Rooms List */}
                  <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 pr-2">
                    {loading ? (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        Loading...
                      </div>
                    ) : filteredRooms.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-medium">
                          {searchQuery ? "No rooms found" : "No chat rooms yet"}
                        </p>
                      </div>
                    ) : (
                      filteredRooms.map((room) => (
                        <div
                          key={room.roomId}
                          className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-slate-50/80 border ${
                            selectedRoomId === room.roomId
                              ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md"
                              : "border-slate-200/60 hover:border-slate-300/60 hover:shadow-sm"
                          }`}
                          onClick={() => onRoomSelect(room.roomId)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start space-x-2 mb-2">
                                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {getRoomTypeIcon(room.type)}
                                </div>
                                <h3 className="text-sm font-semibold text-slate-900 break-words leading-tight">
                                  {room.title}
                                </h3>
                              </div>
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-medium ${getRoomTypeColor(
                                    room.type
                                  )}`}
                                >
                                  {room.type === 'educational-criteria' 
                                    ? getCriteriaLevel(room.criteriaId)
                                    : room.type.replace("-", " ")
                                  }
                                </Badge>
                                <span className="text-xs text-slate-500 font-medium">
                                  {room.messageCount} messages
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 text-xs text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span className="font-medium">
                                  {formatLastMessageTime(room.lastMessageAt)}
                                </span>
                              </div>
                            </div>

                            {/* Room Actions */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchiveRoom(room.roomId, room.title);
                                  }}
                                >
                                  <Archive className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRoom(room.roomId, room.title);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CollapsibleContent>
          </Collapsible>

          {/* Tools Menu */}
          <Collapsible
            open={openMenus["tools"]}
            onOpenChange={() => toggleMenu("tools")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto rounded-xl hover:bg-slate-100/80 transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mr-3">
                    <Wrench className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-slate-800">Tools</span>
                </div>
                {openMenus["tools"] ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 ml-4">
              <Button
                onClick={onToggleTools}
                className="w-full justify-start"
                variant="ghost"
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Math Tools
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Voice Settings Menu */}
          <Collapsible
            open={openMenus["voice"]}
            onOpenChange={() => toggleMenu("voice")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto rounded-xl hover:bg-slate-100/80 transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mr-3">
                    <Volume2Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-slate-800">
                    Voice Settings
                  </span>
                </div>
                {openMenus["voice"] ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 ml-4">
              <Button
                onClick={onToggleAutoPlay}
                className="w-full justify-start"
                variant="ghost"
                size="sm"
              >
                <Play className="w-4 h-4 mr-2" />
                Auto-play Voice
              </Button>
              <Button
                className="w-full justify-start"
                variant="ghost"
                size="sm"
              >
                <Mic className="w-4 h-4 mr-2" />
                Voice Settings
              </Button>
              <Button
                className="w-full justify-start"
                variant="ghost"
                size="sm"
              >
                <Volume1 className="w-4 h-4 mr-2" />
                Volume Control
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Settings Menu */}
          <Collapsible
            open={openMenus["settings"]}
            onOpenChange={() => toggleMenu("settings")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto rounded-xl hover:bg-slate-100/80 transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center mr-3">
                    <Settings2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-slate-800">Settings</span>
                </div>
                {openMenus["settings"] ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 ml-4">
              <Button
                className="w-full justify-start"
                variant="ghost"
                size="sm"
              >
                <User className="w-4 h-4 mr-2" />
                Profile Settings
              </Button>
              <Button
                className="w-full justify-start"
                variant="ghost"
                size="sm"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Help & Support
              </Button>
              <Button
                className="w-full justify-start"
                variant="ghost"
                size="sm"
              >
                <Info className="w-4 h-4 mr-2" />
                About
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* User Info */}
      <div className="p-6 border-t border-slate-200/60 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-slate-500 font-medium">Free Plan</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-8 h-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
