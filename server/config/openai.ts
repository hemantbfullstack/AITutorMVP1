import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate embedding for text
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
};

// Generate response using OpenAI
export const generateResponse = async (messages: any[]): Promise<string> => {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Error generating response:', error);
    throw new Error('Failed to generate response');
  }
};

// Transcribe audio to text
export const transcribeAudio = async (audioFile: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio');
  }
};

// Convert text to speech
export const textToSpeech = async (text: string, voice: string = 'alloy'): Promise<Response> => {
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS API error: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('Error generating speech:', error);
    throw new Error('Failed to generate speech');
  }
};
