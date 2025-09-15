import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  profileImageUrl: {
    type: String
  },
  password: {
    type: String
  },
  isLocalUser: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student'],
    default: 'student',
    required: true
  },
  planId: {
    type: String,
    default: 'free',
    required: true
  },
  usageCount: {
    type: Number,
    default: 0,
    required: true
  },
  usageResetAt: {
    type: Date
  },
  imageUsageCount: {
    type: Number,
    default: 0,
    required: true
  },
  voiceUsageCount: {
    type: Number,
    default: 0,
    required: true
  },
  paperUsageCount: {
    type: Number,
    default: 0,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model('User', UserSchema);
