import fetch from 'node-fetch';

// Text-to-Speech function
const textToSpeech = async (req: any, res: any) => {
  try {
    const { text, voice, model, format } = req.body;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(501).json({ error: "TTS not configured" });
    }

    // Use the provided voice or fall back to default
    const selectedVoice = voice || "alloy";
    const defaultModel = model || "tts-1";
    const outputFormat = format || "mp3";

    // Map format to OpenAI's supported format
    const openaiFormat = outputFormat === "wav" ? "wav" : "mp3";


    const response = await fetch(
      "https://api.openai.com/v1/audio/speech",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: defaultModel,
          input: text,
          voice: selectedVoice,
          response_format: openaiFormat,
          speed: 1.0, // Default speed, can be made configurable
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI TTS API error:", response.status, errorData);
      throw new Error(`OpenAI TTS API error: ${response.status}`);
    }

    // Get the audio data as an ArrayBuffer
    const audioBuffer = await response.arrayBuffer();
    
    // Set the correct content type header
    res.setHeader("Content-Type", `audio/${openaiFormat}`);
    res.setHeader("Content-Length", audioBuffer.byteLength);
    
    // Send the audio data
    res.send(Buffer.from(audioBuffer));
    
  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).json({ error: "TTS temporarily unavailable" });
  }
};

export {
  textToSpeech
};
