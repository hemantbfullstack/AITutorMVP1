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
  
  return data.imageBase64;
}

export function parsePlotQuery(text: string): string | null {
  const normalizedText = text.replace(/–/g, "-").replace(/π/gi, "pi").trim();
  const match = normalizedText.match(/^(?:plot|graph)\s+(.+)/i);
  return match ? `plot ${match[1]}` : null;
}