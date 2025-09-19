import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  RefreshCw
} from 'lucide-react';
import { ChatRoom } from '@/types/chat';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select';

interface ChatRoomSelectorProps {
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  className?: string;
}

export default function ChatRoomSelector({
  selectedRoomId,
  onRoomSelect,
  className = ''
}: ChatRoomSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  const { rooms, loading, deleteRoom, archiveRoom, loadRooms } = useChatRooms();
  const { toast } = useToast();

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

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Chat Rooms</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadRooms()}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="educational-criteria">Educational Criteria</SelectItem>
                <SelectItem value="ib-tutor">IB Tutor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Loading rooms...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              {searchQuery ? 'No rooms found matching your search.' : 'No chat rooms yet.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Create your first room to get started.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredRooms.map((room) => (
              <div
                key={room.roomId}
                className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                  selectedRoomId === room.roomId
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:border-gray-200'
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
                    <div className="flex items-center space-x-2 mb-2">
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
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
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
                        className="h-6 w-6 p-0"
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
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
