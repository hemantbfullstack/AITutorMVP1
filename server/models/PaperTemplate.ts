import mongoose from 'mongoose';

const PaperTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  metaJson: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export default mongoose.model('PaperTemplate', PaperTemplateSchema);
