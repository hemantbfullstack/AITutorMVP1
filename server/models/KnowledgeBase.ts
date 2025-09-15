import mongoose from 'mongoose';

const KnowledgeBaseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  files: [{
    filename: String,
    originalName: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    chunkCount: Number // Store count instead of actual chunks
  }],
  totalChunks: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
KnowledgeBaseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('KnowledgeBase', KnowledgeBaseSchema);
