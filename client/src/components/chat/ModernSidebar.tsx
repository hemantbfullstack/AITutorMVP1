import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Info
} from 'lucide-react';
import { ChatRoom } from '@/types/chat';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  className = ''
}: ModernSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'chat-rooms': true,
    'tools': false,
    'settings': false,
    'voice': false
  });
  
  const { rooms, loading, deleteRoom, archiveRoom, loadRooms } = useChatRooms();
  const { toast } = useToast();
  const { user, logout } = useAuth();

  // Filter rooms based on search and type
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || room.type === filterType;
    return matchesSearch && matchesType && room.isActive;
  });

  // Handle room deletion
  const handleDeleteRoom = async (roomId: string, roomTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${roomTitle}"? This action cannot be undone.`)) {
      const success = await deleteRoom(roomId);
      if (success && selectedRoomId === roomId) {
        onRoomSelect('');
      }
    }
  };

  // Handle room archiving
  const handleArchiveRoom = async (roomId: string, roomTitle: string) => {
    if (window.confirm(`Are you sure you want to archive "${roomTitle}"?`)) {
      await archiveRoom(roomId);
      if (selectedRoomId === roomId) {
        onRoomSelect('');
      }
    }
  };

  // Get room type icon
  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case 'educational-criteria':
        return <BookOpen className="w-4 h-4" />;
      case 'ib-tutor':
        return <GraduationCap className="w-4 h-4" />;
      case 'general':
        return <Users className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Get room type color
  const getRoomTypeColor = (type: string) => {
    switch (type) {
      case 'educational-criteria':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ib-tutor':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'general':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Format last message time
  const formatLastMessageTime = (lastMessageAt: string) => {
    const date = new Date(lastMessageAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
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
    setOpenMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  if (isCollapsed) {
    return (
      <div className={`w-16 bg-gray-100 border-r border-gray-200 flex flex-col items-center py-4 space-y-4 ${className}`}>
        {/* App Logo */}
        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 shadow-sm">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>

        {/* Tab Icons */}
        <div className="flex flex-col space-y-2">
          <Button
            variant={activeTab === 'chat-rooms' ? 'default' : 'ghost'}
            size="sm"
            className="w-10 h-10 p-0"
            onClick={() => setActiveTab('chat-rooms')}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTab === 'tools' ? 'default' : 'ghost'}
            size="sm"
            className="w-10 h-10 p-0"
            onClick={() => setActiveTab('tools')}
          >
            <Wrench className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTab === 'auto-play' ? 'default' : 'ghost'}
            size="sm"
            className="w-10 h-10 p-0"
            onClick={() => setActiveTab('auto-play')}
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
    <div className={`w-80 bg-white border-r border-gray-200 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 shadow-sm">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">AI Tutor</h1>
              <p className="text-xs text-gray-500">Educational Assistant</p>
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
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">

          {/* Chat Rooms Menu */}
          <Collapsible
            open={openMenus['chat-rooms']}
            onOpenChange={() => toggleMenu('chat-rooms')}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto"
              >
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-3" />
                  <span className="font-medium">Chat Rooms</span>
                </div>
                {openMenus['chat-rooms'] ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
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

              {/* Search and Filter */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-8 text-sm"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="educational-criteria">Educational Criteria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rooms Submenu Header */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Available Rooms
                  </span>
                  <span className="text-xs text-gray-400">
                    {filteredRooms.length}
                  </span>
                </div>
              </div>

              {/* Rooms List */}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="p-2 text-center text-gray-500 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-1"></div>
                    Loading...
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="p-2 text-center text-gray-500 text-sm">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs">
                      {searchQuery ? 'No rooms found' : 'No chat rooms yet'}
                    </p>
                  </div>
                ) : (
                  filteredRooms.map((room) => (
                    <div
                      key={room.roomId}
                      className={`group relative p-2 rounded-md cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                        selectedRoomId === room.roomId
                          ? 'bg-blue-50 border border-blue-200'
                          : ''
                      }`}
                      onClick={() => onRoomSelect(room.roomId)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            {getRoomTypeIcon(room.type)}
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {room.title}
                            </h3>
                          </div>
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getRoomTypeColor(room.type)}`}
                            >
                              {room.type.replace('-', ' ')}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {room.messageCount} messages
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatLastMessageTime(room.lastMessageAt)}</span>
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

          {/* Tools Menu */}
          <Collapsible
            open={openMenus['tools']}
            onOpenChange={() => toggleMenu('tools')}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto"
              >
                <div className="flex items-center">
                  <Wrench className="w-4 h-4 mr-3" />
                  <span className="font-medium">Tools</span>
                </div>
                {openMenus['tools'] ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
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
            open={openMenus['voice']}
            onOpenChange={() => toggleMenu('voice')}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto"
              >
                <div className="flex items-center">
                  <Volume2Icon className="w-4 h-4 mr-3" />
                  <span className="font-medium">Voice Settings</span>
                </div>
                {openMenus['voice'] ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
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
            open={openMenus['settings']}
            onOpenChange={() => toggleMenu('settings')}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto"
              >
                <div className="flex items-center">
                  <Settings2 className="w-4 h-4 mr-3" />
                  <span className="font-medium">Settings</span>
                </div>
                {openMenus['settings'] ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
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
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500">Free Plan</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-8 h-8 p-0"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
