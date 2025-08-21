import React, { useState } from "react";
import { TriangleDrawer, TriangleType } from "./TriangleDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomTriangleBuilderProps {
  initialType?: TriangleType;
  initialVertices?: [number, number][];
}

export function CustomTriangleBuilder({ initialType, initialVertices }: CustomTriangleBuilderProps) {
  const [mode, setMode] = useState<"preset" | "coordinates">("preset");
  const [selectedType, setSelectedType] = useState<TriangleType>(initialType || "equilateral");
  const [vertices, setVertices] = useState<[number, number][]>(
    initialVertices || [[50, 150], [150, 150], [100, 50]]
  );
  const [coordinateInputs, setCoordinateInputs] = useState({
    ax: initialVertices?.[0]?.[0]?.toString() || "50",
    ay: initialVertices?.[0]?.[1]?.toString() || "150", 
    bx: initialVertices?.[1]?.[0]?.toString() || "150",
    by: initialVertices?.[1]?.[1]?.toString() || "150",
    cx: initialVertices?.[2]?.[0]?.toString() || "100",
    cy: initialVertices?.[2]?.[1]?.toString() || "50"
  });

  const presetTriangles = [
    { type: "equilateral" as TriangleType, name: "Equilateral", vertices: [[50, 150], [150, 150], [100, 63.4]] },
    { type: "right" as TriangleType, name: "Right (3-4-5)", vertices: [[50, 150], [110, 150], [50, 102]] },
    { type: "isosceles" as TriangleType, name: "Isosceles", vertices: [[50, 150], [150, 150], [100, 80]] },
    { type: "obtuse" as TriangleType, name: "Obtuse Sample", vertices: [[50, 150], [170, 150], [60, 120]] }
  ];

  const handlePresetSelect = (type: TriangleType) => {
    setSelectedType(type);
    const preset = presetTriangles.find(p => p.type === type);
    if (preset) {
      setVertices(preset.vertices as [number, number][]);
    }
  };

  const handleCoordinateChange = (vertex: 'a' | 'b' | 'c', axis: 'x' | 'y', value: string) => {
    const key = `${vertex}${axis}` as keyof typeof coordinateInputs;
    setCoordinateInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyCoordinates = () => {
    try {
      const newVertices: [number, number][] = [
        [parseFloat(coordinateInputs.ax), parseFloat(coordinateInputs.ay)],
        [parseFloat(coordinateInputs.bx), parseFloat(coordinateInputs.by)],
        [parseFloat(coordinateInputs.cx), parseFloat(coordinateInputs.cy)]
      ];
      
      // Validate coordinates
      if (newVertices.some(([x, y]) => isNaN(x) || isNaN(y))) {
        alert("Please enter valid numbers for all coordinates");
        return;
      }
      
      // Check if points are collinear
      const [A, B, C] = newVertices;
      const area = Math.abs((A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]))) / 2;
      if (area < 1) {
        alert("The points are collinear and do not form a triangle. Please adjust coordinates.");
        return;
      }
      
      setVertices(newVertices);
    } catch (error) {
      alert("Please enter valid coordinates");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <i className="fas fa-drafting-compass mr-2 text-primary"></i>
            Custom Triangle Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode selector */}
          <div className="flex space-x-2 mb-4">
            <Button
              variant={mode === "preset" ? "default" : "outline"}
              onClick={() => setMode("preset")}
              size="sm"
              data-testid="button-preset-mode"
            >
              Quick Presets
            </Button>
            <Button
              variant={mode === "coordinates" ? "default" : "outline"}
              onClick={() => setMode("coordinates")}
              size="sm"
              data-testid="button-coordinates-mode"
            >
              Custom Coordinates
            </Button>
          </div>

          {mode === "preset" && (
            <div className="space-y-4">
              <div>
                <Label>Triangle Type</Label>
                <Select value={selectedType} onValueChange={handlePresetSelect}>
                  <SelectTrigger data-testid="select-triangle-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {presetTriangles.map(preset => (
                      <SelectItem key={preset.type} value={preset.type}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {mode === "coordinates" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium text-blue-600">Vertex A</Label>
                  <div className="space-y-1">
                    <Input
                      placeholder="X coordinate"
                      value={coordinateInputs.ax}
                      onChange={(e) => handleCoordinateChange('a', 'x', e.target.value)}
                      data-testid="input-vertex-ax"
                    />
                    <Input
                      placeholder="Y coordinate"  
                      value={coordinateInputs.ay}
                      onChange={(e) => handleCoordinateChange('a', 'y', e.target.value)}
                      data-testid="input-vertex-ay"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-medium text-blue-600">Vertex B</Label>
                  <div className="space-y-1">
                    <Input
                      placeholder="X coordinate"
                      value={coordinateInputs.bx}
                      onChange={(e) => handleCoordinateChange('b', 'x', e.target.value)}
                      data-testid="input-vertex-bx"
                    />
                    <Input
                      placeholder="Y coordinate"
                      value={coordinateInputs.by}
                      onChange={(e) => handleCoordinateChange('b', 'y', e.target.value)}
                      data-testid="input-vertex-by"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-medium text-blue-600">Vertex C</Label>
                  <div className="space-y-1">
                    <Input
                      placeholder="X coordinate"
                      value={coordinateInputs.cx}
                      onChange={(e) => handleCoordinateChange('c', 'x', e.target.value)}
                      data-testid="input-vertex-cx"
                    />
                    <Input
                      placeholder="Y coordinate"
                      value={coordinateInputs.cy}
                      onChange={(e) => handleCoordinateChange('c', 'y', e.target.value)}
                      data-testid="input-vertex-cy"
                    />
                  </div>
                </div>
              </div>
              
              <Button onClick={applyCoordinates} data-testid="button-apply-coordinates">
                <i className="fas fa-pencil-ruler mr-2"></i>
                Draw Triangle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Triangle visualization */}
      <Card>
        <CardContent className="pt-6">
          <TriangleDrawer
            vertices={vertices}
            showLabels={true}
            showAngles={true}
            showDimensions={true}
            size={300}
          />
        </CardContent>
      </Card>
    </div>
  );
}