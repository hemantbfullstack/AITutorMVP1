import React, { useState } from "react";
import { TriangleGallery } from "./TriangleGallery";
import { CustomTriangleBuilder } from "./CustomTriangleBuilder";
import { TriangleType } from "./TriangleDrawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShapesTabProps {
  highlightTriangleType?: TriangleType;
  customVertices?: [number, number][];
  initialMode?: "gallery" | "builder";
}

export function ShapesTab({ 
  highlightTriangleType, 
  customVertices, 
  initialMode = "gallery" 
}: ShapesTabProps) {
  const [activeTab, setActiveTab] = useState(initialMode);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center mb-4">
          <i className="fas fa-shapes mr-2 text-primary"></i>
          Shapes & Diagrams
        </h2>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "gallery" | "builder")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gallery" data-testid="tab-triangle-gallery">
              Triangle Gallery
            </TabsTrigger>
            <TabsTrigger value="builder" data-testid="tab-custom-builder">
              Custom Builder
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeTab === "gallery" && (
            <TriangleGallery highlightType={highlightTriangleType} />
          )}
          
          {activeTab === "builder" && (
            <CustomTriangleBuilder
              initialType={highlightTriangleType}
              initialVertices={customVertices}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}