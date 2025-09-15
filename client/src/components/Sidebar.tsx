import React from 'react';
import { MessageCircle, BookOpen, Clock, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isVoice?: boolean;
  responseTime?: number;
}

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  fileCount: number;
  totalChunks: number;
}

interface SidebarProps {
  messages: Message[];
  selectedKB?: KnowledgeBase;
}

const Sidebar: React.FC<SidebarProps> = ({ messages, selectedKB }) => {
  const recentMessages = messages.slice(-5);

  return (
    <div className="space-y-6">
      {/* Knowledge Base Info */}
      {selectedKB && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <BookOpen className="h-4 w-4 mr-2" />
            Knowledge Base
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p className="font-medium text-gray-900">{selectedKB.name}</p>
            {selectedKB.description && (
              <p className="text-gray-500">{selectedKB.description}</p>
            )}
            <div className="flex items-center space-x-4 text-xs">
              <span>{selectedKB.fileCount} files</span>
              <span>{selectedKB.totalChunks} chunks</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Messages */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          <MessageCircle className="h-4 w-4 mr-2" />
          Recent Messages
        </h3>
        <div className="space-y-3">
          {recentMessages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet</p>
          ) : (
            recentMessages.map((message, index) => (
              <div key={index} className="text-sm">
                <div className="flex items-center space-x-2 mb-1">
                  {message.role === 'user' ? (
                    <User className="h-3 w-3 text-primary-600" />
                  ) : (
                    <MessageCircle className="h-3 w-3 text-gray-500" />
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  {message.isVoice && (
                    <span className="text-xs text-gray-400">🎤</span>
                  )}
                </div>
                <p className="text-gray-700 line-clamp-2">
                  {message.content.substring(0, 100)}
                  {message.content.length > 100 && '...'}
                </p>
                {message.responseTime && (
                  <p className="text-xs text-gray-400 mt-1">
                    {message.responseTime}ms
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          Quick Actions
        </h3>
        <div className="space-y-2">
          <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 p-2 rounded hover:bg-gray-50">
            Clear conversation
          </button>
          <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 p-2 rounded hover:bg-gray-50">
            Export chat
          </button>
          <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 p-2 rounded hover:bg-gray-50">
            Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
