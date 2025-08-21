import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";

export type TriangleType = "equilateral" | "isosceles" | "scalene" | "right" | "obtuse";

interface TriangleDrawerProps {
  vertices?: [number, number][];
  type?: TriangleType;
  showLabels?: boolean;
  showAngles?: boolean;
  showDimensions?: boolean;
  size?: number;
  className?: string;
}

interface TriangleGeometry {
  vertices: [number, number][];
  sides: number[];
  angles: number[];
  perimeter: number;
  area: number;
}

export function TriangleDrawer({
  vertices,
  type = "equilateral",
  showLabels = true,
  showAngles = false,
  showDimensions = false,
  size = 300,
  className = ""
}: TriangleDrawerProps) {
  
  const geometry = useMemo<TriangleGeometry>(() => {
    let finalVertices: [number, number][];
    
    if (vertices) {
      finalVertices = vertices;
    } else {
      // Generate vertices based on type
      const centerX = size / 2;
      const centerY = size / 2;
      const scale = size * 0.3;
      
      switch (type) {
        case "equilateral":
          finalVertices = [
            [centerX - scale * 0.5, centerY + scale * 0.3],
            [centerX + scale * 0.5, centerY + scale * 0.3],
            [centerX, centerY - scale * 0.6]
          ];
          break;
        case "isosceles":
          finalVertices = [
            [centerX - scale * 0.5, centerY + scale * 0.3],
            [centerX + scale * 0.5, centerY + scale * 0.3],
            [centerX, centerY - scale * 0.4]
          ];
          break;
        case "right":
          finalVertices = [
            [centerX - scale * 0.4, centerY + scale * 0.3],
            [centerX + scale * 0.4, centerY + scale * 0.3],
            [centerX - scale * 0.4, centerY - scale * 0.3]
          ];
          break;
        case "obtuse":
          finalVertices = [
            [centerX - scale * 0.6, centerY + scale * 0.2],
            [centerX + scale * 0.4, centerY + scale * 0.2],
            [centerX - scale * 0.3, centerY - scale * 0.3]
          ];
          break;
        default: // scalene
          finalVertices = [
            [centerX - scale * 0.5, centerY + scale * 0.3],
            [centerX + scale * 0.6, centerY + scale * 0.2],
            [centerX - scale * 0.2, centerY - scale * 0.4]
          ];
      }
    }
    
    // Calculate side lengths
    const [A, B, C] = finalVertices;
    const sideA = Math.sqrt((B[0] - C[0]) ** 2 + (B[1] - C[1]) ** 2); // BC
    const sideB = Math.sqrt((A[0] - C[0]) ** 2 + (A[1] - C[1]) ** 2); // AC  
    const sideC = Math.sqrt((A[0] - B[0]) ** 2 + (A[1] - B[1]) ** 2); // AB
    
    const sides = [sideA, sideB, sideC];
    const perimeter = sides.reduce((sum, side) => sum + side, 0);
    
    // Calculate angles using law of cosines
    const angleA = Math.acos((sideB ** 2 + sideC ** 2 - sideA ** 2) / (2 * sideB * sideC));
    const angleB = Math.acos((sideA ** 2 + sideC ** 2 - sideB ** 2) / (2 * sideA * sideC));
    const angleC = Math.PI - angleA - angleB;
    
    const angles = [angleA, angleB, angleC].map(rad => rad * 180 / Math.PI);
    
    // Calculate area using cross product
    const area = Math.abs((A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]))) / 2;
    
    return {
      vertices: finalVertices,
      sides,
      angles,
      perimeter,
      area
    };
  }, [vertices, type, size]);

  const handleExportPNG = () => {
    const svg = document.getElementById(`triangle-svg-${Math.random()}`);
    if (!svg) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = size;
    canvas.height = size;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `triangle-${type || 'custom'}.png`;
          a.click();
          URL.revokeObjectURL(downloadUrl);
        }
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const [A, B, C] = geometry.vertices;
  const svgId = `triangle-svg-${Math.random()}`;

  return (
    <div className={`space-y-2 ${className}`}>
      <svg
        id={svgId}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="border border-slate-200 bg-white rounded"
        data-testid="triangle-svg"
      >
        {/* Triangle */}
        <polygon
          points={`${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]}`}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        
        {/* Vertex labels */}
        {showLabels && (
          <>
            <text x={A[0] - 10} y={A[1] - 5} className="text-sm font-semibold fill-slate-700">A</text>
            <text x={B[0] + 5} y={B[1] - 5} className="text-sm font-semibold fill-slate-700">B</text>
            <text x={C[0] - 5} y={C[1] + 15} className="text-sm font-semibold fill-slate-700">C</text>
          </>
        )}
        
        {/* Side labels */}
        {showLabels && (
          <>
            <text x={(B[0] + C[0]) / 2 + 10} y={(B[1] + C[1]) / 2} className="text-xs fill-slate-600">a</text>
            <text x={(A[0] + C[0]) / 2 - 10} y={(A[1] + C[1]) / 2} className="text-xs fill-slate-600">b</text>
            <text x={(A[0] + B[0]) / 2} y={(A[1] + B[1]) / 2 + 15} className="text-xs fill-slate-600">c</text>
          </>
        )}
        
        {/* Angle arcs */}
        {showAngles && (
          <>
            {/* Angle at A */}
            <path
              d={`M ${A[0] + 15} ${A[1]} A 15 15 0 0 0 ${A[0] + 10.6} ${A[1] - 10.6}`}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1"
            />
            <text x={A[0] + 20} y={A[1] - 8} className="text-xs fill-red-600">
              {Math.round(geometry.angles[0])}°
            </text>
            
            {/* Angle at B */}
            <path
              d={`M ${B[0] - 15} ${B[1]} A 15 15 0 0 1 ${B[0] - 10.6} ${B[1] - 10.6}`}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1"
            />
            <text x={B[0] - 25} y={B[1] - 8} className="text-xs fill-red-600">
              {Math.round(geometry.angles[1])}°
            </text>
            
            {/* Angle at C */}
            <path
              d={`M ${C[0] - 12} ${C[1] - 8} A 15 15 0 0 0 ${C[0] + 12} ${C[1] - 8}`}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1"
            />
            <text x={C[0] - 15} y={C[1] + 25} className="text-xs fill-red-600">
              {Math.round(geometry.angles[2])}°
            </text>
          </>
        )}
        
        {/* Dimension labels */}
        {showDimensions && (
          <>
            <text x={(B[0] + C[0]) / 2 + 15} y={(B[1] + C[1]) / 2 + 10} className="text-xs fill-green-600">
              {geometry.sides[0].toFixed(1)}
            </text>
            <text x={(A[0] + C[0]) / 2 - 20} y={(A[1] + C[1]) / 2 + 10} className="text-xs fill-green-600">
              {geometry.sides[1].toFixed(1)}
            </text>
            <text x={(A[0] + B[0]) / 2} y={(A[1] + B[1]) / 2 - 5} className="text-xs fill-green-600">
              {geometry.sides[2].toFixed(1)}
            </text>
          </>
        )}
        
        {/* Vertex circles */}
        <circle cx={A[0]} cy={A[1]} r="3" fill="#3b82f6" />
        <circle cx={B[0]} cy={B[1]} r="3" fill="#3b82f6" />
        <circle cx={C[0]} cy={C[1]} r="3" fill="#3b82f6" />
      </svg>
      
      <div className="flex items-center justify-between text-xs text-slate-600">
        <div className="space-y-1">
          {showDimensions && (
            <>
              <div>Perimeter: {geometry.perimeter.toFixed(1)}</div>
              <div>Area: {geometry.area.toFixed(1)}</div>
            </>
          )}
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleExportPNG}
          className="text-xs"
          data-testid="button-export-triangle"
        >
          <i className="fas fa-download mr-1"></i>
          Export PNG
        </Button>
      </div>
    </div>
  );
}