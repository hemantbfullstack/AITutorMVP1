import mongoose from 'mongoose';

const ChatRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['educational-criteria', 'general'],
    required: true,
    index: true
  },
  // For educational criteria chats
  criteriaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EducationalCriteria',
    required: function() {
      return this.type === 'educational-criteria';
    }
  },
  // Session ID for the chat (used for API calls)
  sessionId: {
    type: String,
    required: false
  },
  // Chat metadata
  messageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  // TTS preferences for this room
  ttsSettings: {
    selectedVoiceId: {
      type: String,
      default: 'alloy',
      enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    },
    autoPlayVoice: {
      type: Boolean,
      default: false
    },
    volume: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1
    }
  },
  // Room settings
  settings: {
    allowImageUpload: {
      type: Boolean,
      default: true
    },
    enableWolframIntegration: {
      type: Boolean,
      default: true
    },
    maxMessageLength: {
      type: Number,
      default: 4000
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ChatRoomSchema.index({ userId: 1, isActive: 1, lastMessageAt: -1 });
ChatRoomSchema.index({ type: 1, isActive: 1 });
ChatRoomSchema.index({ criteriaId: 1, isActive: 1 });

// Update lastMessageAt when messageCount changes
ChatRoomSchema.pre('save', function(next) {
  if (this.isModified('messageCount') && this.messageCount > 0) {
    this.lastMessageAt = new Date();
  }
  next();
});

// Virtual for room display name
ChatRoomSchema.virtual('displayName').get(function() {
  if (this.title) return this.title;
  
  switch (this.type) {
    case 'educational-criteria':
      return 'Educational Criteria Chat';
    case 'general':
      return 'General Chat';
    default:
      return 'Chat Room';
  }
});

// Ensure virtual fields are serialized
ChatRoomSchema.set('toJSON', { virtuals: true });
ChatRoomSchema.set('toObject', { virtuals: true });

export default mongoose.model('ChatRoom', ChatRoomSchema);
