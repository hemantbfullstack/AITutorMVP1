import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isVoice: {
    type: Boolean,
    default: false
  },
  metadata: {
    knowledgeBase: String,
    tokensUsed: Number,
    responseTime: Number
  }
});

const ChatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  roomId: {
    type: String,
    ref: 'ChatRoom',
    required: false,
    index: true
  },
  criteriaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EducationalCriteria',
    required: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  messages: [MessageSchema],
  totalTokensUsed: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
});

// Update lastActivity before saving
ChatSessionSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

export default mongoose.model('ChatSession', ChatSessionSchema);
