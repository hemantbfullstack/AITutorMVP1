import mongoose from 'mongoose';

const UsageSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  tokensUsed: {
    type: Number,
    default: 0
  },
  ttsMinutes: {
    type: Number,
    default: 0
  },
  sttRequests: {
    type: Number,
    default: 0
  },
  wolframRequests: {
    type: Number,
    default: 0
  },
  embeddingRequests: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  }
});

export default mongoose.model('Usage', UsageSchema);
