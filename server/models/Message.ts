import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    ref: 'ChatRoom',
    index: true
  },
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  // Image support
  image: {
    type: String, // Base64 or URL
    contentType: String
  },
  // Wolfram integration
  wolframImage: String,
  wolframInterpretation: String,
  wolframGenerated: {
    type: Boolean,
    default: false
  },
  // Message metadata
  metadata: {
    tokensUsed: {
      type: Number,
      min: 0
    },
    responseTime: {
      type: Number,
      min: 0
    },
    model: String,
    criteriaUsed: Boolean,
    knowledgeBase: String
  },
  // TTS data (independent of message content)
  ttsData: {
    audioUrl: String,
    duration: {
      type: Number,
      min: 0
    },
    voiceId: {
      type: String,
      enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    },
    generatedAt: Date
  },
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent',
    index: true
  },
  // For streaming messages
  isStreaming: {
    type: Boolean,
    default: false
  },
  // Message reactions (future feature)
  reactions: [{
    userId: String,
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes for better query performance
MessageSchema.index({ roomId: 1, createdAt: -1 });
MessageSchema.index({ userId: 1, createdAt: -1 });
MessageSchema.index({ role: 1, createdAt: -1 });
MessageSchema.index({ status: 1, createdAt: -1 });

// Virtual for message display
MessageSchema.virtual('displayContent').get(function() {
  if (this.content) return this.content;
  if (this.image) return '[Image]';
  if (this.wolframImage) return '[Wolfram Analysis]';
  return '[Empty Message]';
});

// Virtual for message type
MessageSchema.virtual('messageType').get(function() {
  if (this.wolframImage) return 'wolfram';
  if (this.image) return 'image';
  return 'text';
});

// Ensure virtual fields are serialized
MessageSchema.set('toJSON', { virtuals: true });
MessageSchema.set('toObject', { virtuals: true });

// Pre-save middleware to update room message count
MessageSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const ChatRoom = mongoose.model('ChatRoom');
      await ChatRoom.findOneAndUpdate(
        { roomId: this.roomId },
        { 
          $inc: { messageCount: 1 },
          $set: { lastMessageAt: new Date() }
        }
      );
    } catch (error) {
      console.error('Error updating room message count:', error);
    }
  }
  next();
});

// Pre-remove middleware to update room message count
MessageSchema.pre('remove', async function(next) {
  try {
    const ChatRoom = mongoose.model('ChatRoom');
    await ChatRoom.findOneAndUpdate(
      { roomId: this.roomId },
      { $inc: { messageCount: -1 } }
    );
  } catch (error) {
    console.error('Error updating room message count on delete:', error);
  }
  next();
});

export default mongoose.model('Message', MessageSchema);
