import apiClient from './apiClient';

export async function fetchWolframImage(query: string): Promise<string> {
  const response = await apiClient.post("/wolfram/simple", { query });
  
  // The server returns imageBase64 with data:image/png;base64, prefix
  return response.data.imageBase64;
}

export function parsePlotQuery(text: string): string | null {
  const normalizedText = text.replace(/–/g, "-").replace(/π/gi, "pi").trim();
  // Match "Plot y = ..." pattern (case-insensitive)
  const match = normalizedText.match(/^(?:plot|graph)\s+(.+)/i);
  const result = match ? `plot ${match[1]}` : null;
  return result;
}

export async function processImageWithWolfram(imageFile: File): Promise<{ imageBase64: string; interpretation?: string; extractedData?: any }> {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await apiClient.post("/wolfram/cloud-image", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export function detectVisualRequest(text: string): boolean {
  const visualKeywords = [
    'plot', 'graph', 'diagram', 'chart', 'visualize', 'draw', 'sketch',
    'equation', 'formula', 'solve', 'calculate', 'integrate', 'differentiate',
    'derivative', 'integral', 'function', 'curve', 'parabola', 'circle',
    'triangle', 'geometry', 'trigonometry', 'algebra', 'calculus'
  ];
  
  const normalizedText = text.toLowerCase();
  return visualKeywords.some(keyword => normalizedText.includes(keyword));
}