import React from "react";
import { TriangleDrawer } from "./TriangleDrawer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export type TriangleType = "equilateral" | "isosceles" | "scalene" | "right" | "obtuse";

interface TriangleDefinition {
  type: TriangleType;
  title: string;
  description: string;
  vertices: [number, number][];
}

const triangleDefinitions: TriangleDefinition[] = [
  {
    type: "equilateral",
    title: "Equilateral",
    description: "All sides equal, all angles 60°",
    vertices: [[120, 200], [220, 200], [170, 113.4]]
  },
  {
    type: "isosceles",
    title: "Isosceles (Acute)",
    description: "Two sides equal, two angles equal",
    vertices: [[120, 200], [220, 200], [170, 120]]
  },
  {
    type: "scalene",
    title: "Scalene (Acute)",
    description: "All sides different, all angles < 90°",
    vertices: [[120, 200], [230, 200], [160, 130]]
  },
  {
    type: "right",
    title: "Right-angled",
    description: "One 90° angle",
    vertices: [[120, 200], [220, 200], [120, 140]]
  },
  {
    type: "obtuse",
    title: "Obtuse",
    description: "One angle > 90°",
    vertices: [[120, 200], [240, 200], [130, 160]]
  }
];

interface TriangleGalleryProps {
  highlightType?: TriangleType;
}

export function TriangleGallery({ highlightType }: TriangleGalleryProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 flex items-center">
        <i className="fas fa-shapes mr-2 text-primary"></i>
        Triangle Gallery
      </h3>
      
      {/* Single column layout for better organization in sidebar */}
      <div className="space-y-4">
        {triangleDefinitions.map((triangle) => (
          <Card 
            key={triangle.type} 
            className={`transition-all ${
              highlightType === triangle.type 
                ? 'ring-2 ring-primary shadow-lg' 
                : 'hover:shadow-md'
            }`}
            data-testid={`triangle-card-${triangle.type}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-700">
                {triangle.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Triangle visualization */}
              <div className="w-full bg-slate-50 rounded-lg border p-4 flex justify-center">
                <TriangleDrawer
                  vertices={triangle.vertices}
                  showLabels={true}
                  showAngles={true}
                  showDimensions={true}
                  size={200}
                />
              </div>
              
              {/* Triangle properties */}
              <div className="space-y-2">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {triangle.description}
                </p>
                
                {/* Properties in a nice grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-50 rounded-md p-2 text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                      Perimeter
                    </div>
                    <div className="text-sm font-mono font-semibold text-slate-700">
                      {calculatePerimeter(triangle.vertices).toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-md p-2 text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                      Area
                    </div>
                    <div className="text-sm font-mono font-semibold text-slate-700">
                      {calculateArea(triangle.vertices).toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Helper functions to calculate triangle properties
function calculatePerimeter(vertices: [number, number][]): number {
  const [a, b, c] = vertices;
  const side1 = Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2));
  const side2 = Math.sqrt(Math.pow(c[0] - b[0], 2) + Math.pow(c[1] - b[1], 2));
  const side3 = Math.sqrt(Math.pow(a[0] - c[0], 2) + Math.pow(a[1] - c[1], 2));
  return side1 + side2 + side3;
}

function calculateArea(vertices: [number, number][]): number {
  const [a, b, c] = vertices;
  return Math.abs((a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])) / 2);
}