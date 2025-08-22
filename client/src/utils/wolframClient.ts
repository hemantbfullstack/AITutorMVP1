export async function fetchWolframImage(query: string): Promise<string> {
  const response = await fetch("/api/wolfram/simple", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Wolfram failed");
  }
  
  // The server returns imageBase64 with data:image/png;base64, prefix
  return data.imageBase64;
}

export function parsePlotQuery(text: string): string | null {
  const normalizedText = text.replace(/–/g, "-").replace(/π/gi, "pi").trim();
  // Match "Plot y = ..." pattern (case-insensitive)
  const match = normalizedText.match(/^(?:plot|graph)\s+(.+)/i);
  const result = match ? `plot ${match[1]}` : null;
  console.log("parsePlotQuery:", { text, normalizedText, match: !!match, result });
  return result;
}