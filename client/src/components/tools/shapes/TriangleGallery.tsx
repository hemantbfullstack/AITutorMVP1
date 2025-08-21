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
    vertices: [[100, 180], [200, 180], [150, 93.4]]
  },
  {
    type: "isosceles",
    title: "Isosceles (Acute)",
    description: "Two sides equal, two angles equal",
    vertices: [[100, 180], [200, 180], [150, 100]]
  },
  {
    type: "scalene",
    title: "Scalene (Acute)",
    description: "All sides different, all angles < 90°",
    vertices: [[100, 180], [210, 180], [140, 110]]
  },
  {
    type: "right",
    title: "Right-angled",
    description: "One 90° angle",
    vertices: [[100, 180], [200, 180], [100, 120]]
  },
  {
    type: "obtuse",
    title: "Obtuse",
    description: "One angle > 90°",
    vertices: [[100, 180], [220, 180], [110, 140]]
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                {triangle.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="aspect-square bg-slate-50 rounded border">
                <TriangleDrawer
                  vertices={triangle.vertices}
                  showLabels={true}
                  showAngles={true}
                  showDimensions={true}
                  size={200}
                />
              </div>
              <p className="text-xs text-slate-600">{triangle.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}