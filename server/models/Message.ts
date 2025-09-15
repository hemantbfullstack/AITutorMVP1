import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    ref: 'TutorSession'
  },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  image: {
    type: String
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export default mongoose.model('Message', MessageSchema);
