import { TriangleType } from "@/components/tools/shapes/TriangleDrawer";
import { parseGraphQuery, detectGraphIntent } from "./parseGraphQuery";

export interface DrawingIntent {
  type: "triangle" | "graph" | null;
  triangleType?: TriangleType;
  vertices?: [number, number][];
  functionExpression?: string;
  graphData?: {
    functions: string[];
    xmin: number;
    xmax: number;
  };
  confidence: number;
}

export interface UIAction {
  type: "triangle" | "graph";
  variant?: TriangleType;
  vertices?: [number, number][];
  func?: string;
  functions?: string[];
  range?: [number, number];
}

const triangleKeywords = {
  equilateral: ["equilateral", "equal sides", "all sides equal", "60 degree", "60°"],
  isosceles: ["isosceles", "two equal sides", "two sides equal", "equal sides"],
  scalene: ["scalene", "different sides", "all different", "no equal sides"],
  right: ["right triangle", "right-angled", "90 degree", "90°", "pythagorean", "3-4-5"],
  obtuse: ["obtuse", "obtuse angle", "greater than 90", "> 90", "120 degree", "120°"]
};

const drawingKeywords = [
  "draw", "show", "display", "sketch", "illustrate", "render", "create", "make", "build",
  "triangle", "shape", "diagram", "figure", "geometry", "plot", "graph", "chart"
];

export function detectDrawingIntent(message: string): DrawingIntent {
  const lowerMessage = message.toLowerCase();
  
  // Enhanced graph detection using parseGraphQuery
  if (detectGraphIntent(message)) {
    try {
      const graphData = parseGraphQuery(message);
      return {
        type: "graph",
        graphData,
        confidence: 0.9
      };
    } catch (error) {
      return {
        type: "graph",
        confidence: 0.7
      };
    }
  }
  
  // Check for drawing/visual keywords
  const hasDrawingKeyword = drawingKeywords.some(keyword => lowerMessage.includes(keyword));
  if (!hasDrawingKeyword) {
    return { type: null, confidence: 0 };
  }

  // Check for triangle-specific types
  for (const [type, keywords] of Object.entries(triangleKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: "triangle",
        triangleType: type as TriangleType,
        confidence: 0.9
      };
    }
  }

  // Check for vertices coordinates
  const vertexPattern = /\((\d+\.?\d*),\s*(\d+\.?\d*)\)/g;
  const matches = Array.from(message.matchAll(vertexPattern));
  if (matches.length === 3) {
    const vertices: [number, number][] = matches.map(match => [
      parseFloat(match[1]),
      parseFloat(match[2])
    ]);
    
    return {
      type: "triangle",
      vertices,
      confidence: 0.95
    };
  }

  // General triangle request
  if (lowerMessage.includes("triangle")) {
    return {
      type: "triangle",
      confidence: 0.7
    };
  }

  return { type: null, confidence: 0 };
}

export function createUIAction(intent: DrawingIntent): UIAction | null {
  if (!intent.type || intent.confidence < 0.5) {
    return null;
  }

  switch (intent.type) {
    case "triangle":
      return {
        type: "triangle",
        variant: intent.triangleType,
        vertices: intent.vertices
      };
    
    case "graph":
      if (intent.graphData) {
        return {
          type: "graph",
          functions: intent.graphData.functions,
          range: [intent.graphData.xmin, intent.graphData.xmax]
        };
      }
      return {
        type: "graph",
        func: intent.functionExpression,
        range: [-10, 10]
      };
    
    default:
      return null;
  }
}