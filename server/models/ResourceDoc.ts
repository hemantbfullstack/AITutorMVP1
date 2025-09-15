import mongoose from 'mongoose';

const ResourceDocSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export default mongoose.model('ResourceDoc', ResourceDocSchema);
