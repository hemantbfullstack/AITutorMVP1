import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
  sid: {
    type: String,
    required: true,
    unique: true
  },
  sess: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  expire: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  }
});

export default mongoose.model('Session', SessionSchema);
