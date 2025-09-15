import express from 'express';
import multer from 'multer';
import { transcribeAudio, textToSpeech } from '../config/openai.js';

const router = express.Router();

// Configure multer for audio uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Speech-to-Text endpoint
router.post('/stt', upload.single('audio'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // Create a file-like object for OpenAI API
    const audioFile = new File([req.file.buffer], req.file.originalname, {
      type: req.file.mimetype
    });

    const transcription = await transcribeAudio(audioFile);

    res.json({
      success: true,
      transcription: {
        text: transcription,
        language: 'auto-detected',
        duration: req.file.size // Approximate
      }
    });

  } catch (error: any) {
    console.error('STT error:', error);
    res.status(500).json({ 
      error: 'Failed to transcribe audio',
      details: error.message 
    });
  }
});

// Text-to-Speech endpoint
router.post('/tts', async (req: any, res: any) => {
  try {
    const { text, voice = 'alloy' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Use OpenAI TTS only
    const response = await textToSpeech(text, voice);
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const contentType = 'audio/mpeg';

    res.set({
      'Content-Type': contentType,
      'Content-Length': audioBuffer.length
    });

    res.send(audioBuffer);

  } catch (error: any) {
    console.error('TTS error:', error);
    res.status(500).json({ 
      error: 'Failed to generate speech',
      details: error.message 
    });
  }
});

// Get available voices
router.get('/voices', async (req: any, res: any) => {
  try {
    const voices = [
      { id: 'alloy', name: 'Alloy', provider: 'openai' },
      { id: 'echo', name: 'Echo', provider: 'openai' },
      { id: 'fable', name: 'Fable', provider: 'openai' },
      { id: 'onyx', name: 'Onyx', provider: 'openai' },
      { id: 'nova', name: 'Nova', provider: 'openai' },
      { id: 'shimmer', name: 'Shimmer', provider: 'openai' }
    ];

    res.json({
      success: true,
      voices
    });

  } catch (error: any) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

export default router;
