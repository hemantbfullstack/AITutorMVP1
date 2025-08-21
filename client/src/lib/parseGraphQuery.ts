interface ParsedGraphQuery {
  functions: string[];
  xmin: number;
  xmax: number;
}

export function parseGraphQuery(input: string): ParsedGraphQuery {
  const defaultRange = { xmin: -10, xmax: 10 };
  
  // Normalize the input
  let normalized = input.toLowerCase().trim();
  
  // Handle unicode minus and replace π with Math.PI
  normalized = normalized
    .replace(/–/g, '-')  // unicode minus
    .replace(/π/g, 'pi')
    .replace(/\bpi\b/g, 'Math.PI');
  
  // Extract functions - look for various patterns
  const functions: string[] = [];
  
  // Pattern 1: "plot y = expression" or "graph y = expression"
  const yEqualsMatch = normalized.match(/(?:plot|graph|show)\s+y\s*=\s*([^,\n]+?)(?:\s+(?:from|on|in)\s|$)/);
  if (yEqualsMatch) {
    functions.push(yEqualsMatch[1].trim());
  }
  
  // Pattern 2: "plot expression" (without y =)
  const directFunctionMatch = normalized.match(/(?:plot|graph|show)\s+([^,\n\s]+(?:\([^)]*\))?[^,\n]*?)(?:\s+(?:from|on|in)\s|$)/);
  if (!yEqualsMatch && directFunctionMatch) {
    let func = directFunctionMatch[1].trim();
    // Clean up common artifacts
    func = func.replace(/^y\s*=\s*/, '');
    if (func && !func.includes('from') && !func.includes('to')) {
      functions.push(func);
    }
  }
  
  // Pattern 3: Multiple functions "sin(x), cos(x)"
  const multipleMatch = input.match(/(?:plot|graph|show)\s+([^,]+(?:,\s*[^,]+)*)/i);
  if (multipleMatch && !yEqualsMatch) {
    const parts = multipleMatch[1].split(',').map(f => f.trim());
    parts.forEach(part => {
      let func = part.replace(/^y\s*=\s*/, '').trim();
      if (func && !func.includes('from') && !func.includes('to') && !func.includes('on')) {
        functions.push(func);
      }
    });
  }
  
  // Extract range
  let xmin = defaultRange.xmin;
  let xmax = defaultRange.xmax;
  
  // Pattern: "from a to b" or "from -a to b"
  const fromToMatch = normalized.match(/from\s+(-?\d*\.?\d*(?:\*?math\.pi)?)\s+to\s+(-?\d*\.?\d*(?:\*?math\.pi)?)/);
  if (fromToMatch) {
    xmin = evaluateNumber(fromToMatch[1]);
    xmax = evaluateNumber(fromToMatch[2]);
  }
  
  // Pattern: "on [a, b]" or "in [a, b]"
  const onRangeMatch = normalized.match(/(?:on|in)\s*\[\s*(-?\d*\.?\d*(?:\*?math\.pi)?)\s*,\s*(-?\d*\.?\d*(?:\*?math\.pi)?)\s*\]/);
  if (onRangeMatch) {
    xmin = evaluateNumber(onRangeMatch[1]);
    xmax = evaluateNumber(onRangeMatch[2]);
  }
  
  // Clamp absurd ranges
  if (Math.abs(xmin) > 1e6 || Math.abs(xmax) > 1e6 || xmax <= xmin) {
    xmin = defaultRange.xmin;
    xmax = defaultRange.xmax;
  }
  
  // If no functions found, try to extract from the whole input
  if (functions.length === 0) {
    // Look for mathematical expressions
    const mathExprMatch = input.match(/([a-z]+\([^)]*\)|[x^2-9\+\-\*\/\(\)\.]+)/i);
    if (mathExprMatch) {
      functions.push(mathExprMatch[1].trim());
    }
  }
  
  return {
    functions: functions.length > 0 ? functions : ['x^2'], // fallback
    xmin,
    xmax
  };
}

function evaluateNumber(str: string): number {
  if (!str) return 0;
  
  // Handle Math.PI
  if (str.includes('math.pi')) {
    return eval(str.replace(/math\.pi/g, Math.PI.toString()));
  }
  
  // Handle pi
  if (str.includes('pi')) {
    return eval(str.replace(/pi/g, Math.PI.toString()));
  }
  
  return parseFloat(str) || 0;
}

// Enhanced graph intent detection
export function detectGraphIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Direct graph keywords
  if (/^\s*(plot|graph|show)\b/i.test(message)) {
    return true;
  }
  
  // Contains "y =" with mathematical expression
  if (/y\s*=\s*[x\w\(\)\+\-\*\/\^\.\s]+/i.test(message)) {
    return true;
  }
  
  // Mathematical function patterns
  const mathPatterns = [
    /\b(sin|cos|tan|log|ln|exp|sqrt|abs)\s*\(/i,
    /x\^?\d+/i,
    /\dx\b/i,
    /[xy]\s*[\+\-\*\/]/i
  ];
  
  return mathPatterns.some(pattern => pattern.test(message));
}