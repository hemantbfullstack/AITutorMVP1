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