import mongoose from 'mongoose';

const TutorSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  title: {
    type: String,
    trim: true
  },
  ibSubject: {
    type: String,
    enum: ['AA', 'AI'],
    required: true
  },
  ibLevel: {
    type: String,
    enum: ['HL', 'SL'],
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  }
}, {
  timestamps: true
});

export default mongoose.model('TutorSession', TutorSessionSchema);
