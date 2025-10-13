import apiClient from './apiClient';

export async function fetchWolframImage(query: string): Promise<string> {
  const response = await apiClient.post("/wolfram/simple", { query });
  
  // The server returns imageBase64 with data:image/png;base64, prefix
  return response.data.imageBase64;
}

export function parsePlotQuery(text: string): string | null {
  const normalizedText = text.replace(/–/g, "-").replace(/π/gi, "pi").trim();
  
  // Direct plot/graph commands
  let match = normalizedText.match(/^(?:plot|graph|draw|sketch|visualize)\s+(.+)/i);
  if (match) return `plot ${match[1]}`;
  
  // "Show me" patterns
  match = normalizedText.match(/^(?:show me|create|generate|make|display|illustrate|demonstrate)\s+(.+)/i);
  if (match) return `plot ${match[1]}`;
  
  // "Explain with" patterns - ONLY if it contains "with" for visual context
  match = normalizedText.match(/^(?:explain|help with|illustrate|demonstrate|show how)\s+(.+?)\s+with\s+(?:diagram|graph|image|picture|chart|visual)/i);
  if (match) return `plot ${match[1]}`;
  
  // Mathematical expressions (equations, functions, etc.)
  match = normalizedText.match(/(?:y\s*=\s*|f\(x\)\s*=\s*|equation\s*:?\s*|function\s*:?\s*|formula\s*:?\s*)(.+)/i);
  if (match) return `plot ${match[1]}`;
  
  // Function names with parameters
  match = normalizedText.match(/(?:sin|cos|tan|log|ln|exp|sqrt|abs|mod|floor|ceil)\s*\([^)]+\)/i);
  if (match) return `plot ${match[0]}`;
  
  // Polynomial expressions
  match = normalizedText.match(/(?:x\^?\d+|x\s*\^?\s*\d+|[+-]?\d*x\^?\d*)/i);
  if (match) {
    // Extract the full mathematical expression
    const mathMatch = normalizedText.match(/([+-]?\d*x\^?\d*(?:\s*[+-]\s*\d*x\^?\d*)*)/i);
    if (mathMatch) return `plot ${mathMatch[1]}`;
  }
  
  // Geometric shapes
  match = normalizedText.match(/(?:circle|ellipse|parabola|hyperbola|triangle|square|rectangle|polygon)\s*(?:with\s+)?(?:radius|center|vertices|sides|angles?)?\s*([^.!?]*)/i);
  if (match) return `plot ${match[1] || match[0]}`;
  
  // If no specific pattern matches but contains mathematical content, try to extract it
  const mathContent = normalizedText.match(/([+-]?\d*x\^?\d*(?:\s*[+-]\s*\d*x\^?\d*)*(?:\s*[+-]\s*\d+)?)/i);
  if (mathContent) return `plot ${mathContent[1]}`;
  
  return null;
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

// Enhanced function to generate Wolfram queries for various types of visual requests
export function generateWolframQuery(text: string): string | null {
  const normalizedText = text.replace(/–/g, "-").replace(/π/gi, "pi").trim().toLowerCase();
  
  console.log("🔍 generateWolframQuery called with:", text);
  
  // Try to parse as a direct plot query first
  const plotQuery = parsePlotQuery(text);
  if (plotQuery) {
    console.log("✅ parsePlotQuery returned:", plotQuery);
    return plotQuery;
  }
  
  // ONLY handle "explain with" patterns - not general "explain" requests
  if (normalizedText.includes('explain with') || normalizedText.includes('help with')) {
    // Extract the mathematical concept
    const conceptMatch = text.match(/(?:explain with|help with|illustrate|demonstrate|show how)\s+(.+?)(?:\s+with\s+(?:diagram|graph|image|picture|chart|visual))?/i);
    if (conceptMatch) {
      const concept = conceptMatch[1].trim();
      // Try to convert to a plottable expression
      if (concept.match(/[x\^]/) || concept.match(/(?:sin|cos|tan|log|exp|sqrt)/)) {
        return `plot ${concept}`;
      }
      // For general concepts, try to create a relevant visualization
      return `plot ${concept}`;
    }
  }
  
  // Handle "with diagram/graph/image" requests
  if (normalizedText.includes('with diagram') || normalizedText.includes('with graph') || 
      normalizedText.includes('with image') || normalizedText.includes('with picture')) {
    // Extract the main concept before "with"
    const beforeWith = text.split(/\s+with\s+/i)[0];
    const conceptMatch = beforeWith.match(/(?:explain|help with|illustrate|demonstrate|show how)\s+(.+)/i);
    if (conceptMatch) {
      return `plot ${conceptMatch[1]}`;
    }
  }
  
  // Handle step-by-step visual explanations
  if (normalizedText.includes('step by step')) {
    const conceptMatch = text.match(/(?:explain|help with|illustrate|demonstrate|show how)\s+(.+?)(?:\s+step\s+by\s+step)?/i);
    if (conceptMatch) {
      return `plot ${conceptMatch[1]}`;
    }
  }
  
  // REMOVED: Broad mathematical topic detection
  // This was causing conceptual questions to go to WolframAlpha
  
  console.log("❌ generateWolframQuery returning null - no visual query generated");
  return null;
}

// Function to handle context-aware visual requests
export function generateContextualWolframQuery(text: string, previousMessages: any[] = []): string | null {
  const normalizedText = text.replace(/–/g, "-").replace(/π/gi, "pi").trim().toLowerCase();
  
  // Check if user is asking to explain something with visuals that was previously discussed
  if (normalizedText.includes('explain') && (normalizedText.includes('with') || normalizedText.includes('using'))) {
    // Look for mathematical concepts in previous messages
    const recentMessages = previousMessages.slice(-5); // Last 5 messages for context
    const mathConcepts = [];
    
    for (const msg of recentMessages) {
      if (msg.role === 'assistant' && msg.content) {
        // Extract mathematical expressions from previous responses
        const mathMatches = msg.content.match(/([+-]?\d*x\^?\d*(?:\s*[+-]\s*\d*x\^?\d*)*(?:\s*[+-]\s*\d+)?)/g);
        if (mathMatches) {
          mathConcepts.push(...mathMatches);
        }
        
        // Extract function names
        const functionMatches = msg.content.match(/(?:sin|cos|tan|log|ln|exp|sqrt|abs|mod|floor|ceil)\s*\([^)]+\)/gi);
        if (functionMatches) {
          mathConcepts.push(...functionMatches);
        }
      }
    }
    
    // If we found mathematical concepts in previous messages, use them
    if (mathConcepts.length > 0) {
      const uniqueConcepts = [...new Set(mathConcepts)];
      return `plot ${uniqueConcepts.slice(0, 3).join(', ')}`; // Use up to 3 concepts
    }
  }
  
  // Check if user is asking to visualize something that was just solved
  if (normalizedText.includes('visualize') || normalizedText.includes('show') || normalizedText.includes('graph')) {
    // Look for equations or functions in the current message
    const equationMatch = text.match(/(?:y\s*=\s*|f\(x\)\s*=\s*|equation\s*:?\s*|function\s*:?\s*|formula\s*:?\s*)(.+)/i);
    if (equationMatch) {
      return `plot ${equationMatch[1]}`;
    }
    
    // Look for mathematical expressions
    const mathMatch = text.match(/([+-]?\d*x\^?\d*(?:\s*[+-]\s*\d*x\^?\d*)*(?:\s*[+-]\s*\d+)?)/i);
    if (mathMatch) {
      return `plot ${mathMatch[1]}`;
    }
  }
  
  // Fall back to regular query generation
  return generateWolframQuery(text);
}

export function detectVisualRequest(text: string): boolean {
  const normalizedText = text.toLowerCase();
  
  console.log("🔍 detectVisualRequest called with:", text);
  
  // ONLY direct visual requests - these should go to WolframAlpha
  const directVisualKeywords = [
    'plot', 'graph', 'diagram', 'chart', 'visualize', 'draw', 'sketch', 'image', 'picture',
    'show me', 'create', 'generate', 'make', 'display'
  ];
  
  // Check for direct visual requests first
  if (directVisualKeywords.some(keyword => normalizedText.includes(keyword))) {
    console.log("✅ Direct visual keyword detected:", directVisualKeywords.find(k => normalizedText.includes(k)));
    return true;
  }
  
  // Check for "explain with" patterns - these should go to WolframAlpha
  const explainWithPatterns = [
    'explain with', 'help with', 'illustrate', 'demonstrate', 'show how',
    'with diagram', 'with graph', 'with image', 'with picture', 'with chart',
    'with visual', 'with graphical', 'with pictorial'
  ];
  
  if (explainWithPatterns.some(pattern => normalizedText.includes(pattern))) {
    console.log("✅ Explain with pattern detected:", explainWithPatterns.find(p => normalizedText.includes(p)));
    return true;
  }
  
  // Check for mathematical expressions that can be plotted
  const mathExpressionPatterns = [
    // Function definitions - must start with these patterns
    /^y\s*=\s*[^.!?]*/i,
    /^f\(x\)\s*=\s*[^.!?]*/i,
    /^equation\s*:?\s*[^.!?]*/i,
    /^function\s*:?\s*[^.!?]*/i,
    /^formula\s*:?\s*[^.!?]*/i,
    
    // Mathematical functions - must be standalone
    /^(?:sin|cos|tan|log|ln|exp|sqrt|abs|mod|floor|ceil)\s*\([^)]+\)$/i,
    
    // Polynomial expressions - must be standalone mathematical expressions
    /^[+-]?\d*x\^?\d*(?:\s*[+-]\s*\d*x\^?\d*)*(?:\s*[+-]\s*\d+)?$/i,
    
    // Geometric shapes - must start with these patterns
    /^(?:circle|ellipse|parabola|hyperbola|triangle|square|rectangle|polygon)\s*(?:with\s+)?(?:radius|center|vertices|sides|angles?)?\s*[^.!?]*/i
  ];
  
  for (let i = 0; i < mathExpressionPatterns.length; i++) {
    if (mathExpressionPatterns[i].test(text)) {
      console.log("✅ Mathematical expression pattern detected:", mathExpressionPatterns[i], "matched text:", text);
      return true;
    }
  }
  
  // Check for step-by-step visual requests
  if (normalizedText.includes('step by step') && 
      (normalizedText.includes('explain') || normalizedText.includes('help'))) {
    console.log("✅ Step by step visual request detected");
    return true;
  }
  
  console.log("❌ No visual request detected - going to OpenAI");
  return false;
}