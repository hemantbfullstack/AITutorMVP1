import mongoose from 'mongoose';

const GeneratedPaperSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  subject: {
    type: String,
    enum: ['AA', 'AI'],
    required: true
  },
  level: {
    type: String,
    enum: ['HL', 'SL'],
    required: true
  },
  paperType: {
    type: String,
    enum: ['P1', 'P2'],
    required: true
  },
  topics: [{
    type: String
  }],
  questionsJson: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  markschemeJson: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true
  },
  pdfUrl: {
    type: String
  },
  msPdfUrl: {
    type: String
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export default mongoose.model('GeneratedPaper', GeneratedPaperSchema);
