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
  
  // "Explain with" patterns
  match = normalizedText.match(/^(?:explain|help with|illustrate|demonstrate|show how)\s+(.+?)(?:\s+with\s+(?:diagram|graph|image|picture|chart|visual))?/i);
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
  
  // Try to parse as a direct plot query first
  const plotQuery = parsePlotQuery(text);
  if (plotQuery) return plotQuery;
  
  // Handle specific educational requests
  if (normalizedText.includes('explain') || normalizedText.includes('help with')) {
    // Extract the mathematical concept
    const conceptMatch = text.match(/(?:explain|help with|illustrate|demonstrate|show how)\s+(.+?)(?:\s+with\s+(?:diagram|graph|image|picture|chart|visual))?/i);
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
  
  // Handle specific mathematical topics with more detailed queries
  const mathTopics = {
    'derivative': 'plot derivative of common functions',
    'integral': 'plot integral of common functions',
    'limit': 'plot limit concept with examples',
    'continuity': 'plot continuous and discontinuous functions',
    'trigonometry': 'plot sin(x), cos(x), tan(x) from -2π to 2π',
    'algebra': 'plot polynomial functions',
    'geometry': 'plot geometric shapes and their properties',
    'statistics': 'plot normal distribution and other probability distributions',
    'probability': 'plot probability distributions',
    'calculus': 'plot calculus concepts and functions',
    'functions': 'plot various types of functions',
    'equations': 'plot solutions to equations',
    'inequalities': 'plot inequality regions',
    'sequences': 'plot sequence convergence',
    'series': 'plot series convergence',
    'vectors': 'plot vector fields and operations',
    'matrices': 'plot matrix transformations',
    'complex': 'plot complex number operations',
    'logarithm': 'plot logarithmic functions',
    'exponential': 'plot exponential functions',
    'polynomial': 'plot polynomial functions of various degrees',
    'quadratic': 'plot quadratic functions and parabolas',
    'linear': 'plot linear functions and lines',
    'cubic': 'plot cubic functions',
    'hyperbola': 'plot hyperbola and its properties',
    'ellipse': 'plot ellipse and its properties',
    'parabola': 'plot parabola and its properties',
    'circle': 'plot circle and its properties',
    'triangle': 'plot triangle and its properties',
    'square': 'plot square and its properties',
    'rectangle': 'plot rectangle and its properties',
    'polygon': 'plot various polygons',
    'angle': 'plot angle measurements and relationships',
    'perimeter': 'plot perimeter calculations',
    'area': 'plot area calculations',
    'volume': 'plot volume calculations',
    'surface area': 'plot surface area calculations',
    'coordinate': 'plot coordinate geometry',
    'axis': 'plot coordinate axes and transformations',
    'slope': 'plot slope and gradient',
    'intercept': 'plot intercepts and intersections',
    'vertex': 'plot vertices and critical points',
    'focus': 'plot foci of conic sections',
    'eccentricity': 'plot eccentricity of conic sections',
    'asymptote': 'plot asymptotes of functions',
    'sine': 'plot sine function and its properties',
    'cosine': 'plot cosine function and its properties',
    'tangent': 'plot tangent function and its properties',
    'logarithmic': 'plot logarithmic functions',
    'exponential': 'plot exponential functions'
  };
  
  for (const [topic, query] of Object.entries(mathTopics)) {
    if (normalizedText.includes(topic)) {
      return query;
    }
  }
  
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
  const visualKeywords = [
    // Direct visual requests
    'plot', 'graph', 'diagram', 'chart', 'visualize', 'draw', 'sketch', 'image', 'picture',
    'show me', 'create', 'generate', 'make', 'display', 'illustrate', 'demonstrate',
    
    // Mathematical concepts that benefit from visualization
    'equation', 'formula', 'solve', 'calculate', 'integrate', 'differentiate',
    'derivative', 'integral', 'function', 'curve', 'parabola', 'circle', 'ellipse',
    'triangle', 'square', 'rectangle', 'polygon', 'geometry', 'trigonometry', 
    'algebra', 'calculus', 'statistics', 'probability', 'matrix', 'vector',
    
    // Educational visual aids
    'explain with', 'help with', 'illustrate', 'demonstrate', 'show how',
    'with diagram', 'with graph', 'with image', 'with picture', 'with chart',
    'step by step', 'visual', 'graphical', 'pictorial',
    
    // Specific mathematical functions and concepts
    'sine', 'cosine', 'tangent', 'logarithm', 'exponential', 'polynomial',
    'quadratic', 'linear', 'cubic', 'hyperbola', 'asymptote', 'limit',
    'continuity', 'differentiation', 'integration', 'series', 'sequence',
    
    // Geometric shapes and concepts
    'angle', 'perimeter', 'area', 'volume', 'surface area', 'coordinate',
    'axis', 'slope', 'intercept', 'vertex', 'focus', 'eccentricity'
  ];
  
  const normalizedText = text.toLowerCase();
  return visualKeywords.some(keyword => normalizedText.includes(keyword));
}