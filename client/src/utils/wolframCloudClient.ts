import apiClient from './apiClient';

// Wolfram Cloud API functions for image processing
export async function processImageWithWolframCloud(imageFile: File): Promise<{
  imageBase64: string;
  interpretation: string;
  extractedData?: any;
}> {
  console.log("🌐 Processing image with Wolfram Cloud:", imageFile.name);
  
  const formData = new FormData();
  formData.append('image', imageFile);
  
  try {
    const response = await apiClient.post("/wolfram/cloud-image", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log("✅ Wolfram Cloud response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Wolfram Cloud processing failed:", error);
    throw error;
  }
}

// Fallback to simple Wolfram Alpha for text-based queries
export async function processTextWithWolframAlpha(query: string): Promise<string> {
  console.log("📝 Processing text with Wolfram Alpha:", query);
  
  try {
    const response = await apiClient.post("/wolfram/simple", { query });
    return response.data.imageBase64;
  } catch (error) {
    console.error("❌ Wolfram Alpha processing failed:", error);
    throw error;
  }
}

// Detect if the image contains mathematical content (graphs, equations, etc.)
export function detectMathematicalImage(imageFile: File): boolean {
  const fileName = imageFile.name.toLowerCase();
  const mathematicalKeywords = [
    'graph', 'plot', 'chart', 'equation', 'formula', 'math', 'function',
    'curve', 'line', 'parabola', 'sine', 'cosine', 'exponential', 'logarithm'
  ];
  
  return mathematicalKeywords.some(keyword => fileName.includes(keyword));
}
