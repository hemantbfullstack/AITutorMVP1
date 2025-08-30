import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator } from "./Calculator";
import { GraphTool } from "./GraphTool";
import { WolframTool } from "./WolframTool";
import { ShapesTab } from "./shapes/ShapesTab";
import { TriangleType } from "./shapes/TriangleDrawer";
import { onGraphRender, type GraphPayload } from "@/lib/graphBus";
import { useChat } from "../../hooks/useChat";

interface MathToolsSidebarProps {
  highlightTriangleType?: TriangleType;
  customVertices?: [number, number][];
  openShapesTab?: boolean;
  graphFunctions?: string[];
  graphRange?: [number, number];
  isExpanded?: boolean;
}

export default function MathToolsSidebar({ 
  highlightTriangleType, 
  customVertices, 
  openShapesTab,
  graphFunctions,
  graphRange,
  isExpanded = true
}: MathToolsSidebarProps) {
  const [activeTab, setActiveTab] = useState(openShapesTab ? "shapes" : "calculator");
  const [currentGraphData, setCurrentGraphData] = useState<{ functions: string[], range: [number, number] } | null>(null);
  const { sendToChatWithPayload } = useChat();

  // Listen for real-time graph render events from chat
  useEffect(() => {
    return onGraphRender((payload: GraphPayload) => {
      setCurrentGraphData({
        functions: payload.functions,
        range: [payload.xmin, payload.xmax]
      });
      setActiveTab("graphs");
    });
  }, []);

  if (!isExpanded) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 p-2">
        <div className="text-center">
          <i className="fas fa-calculator text-2xl text-primary mb-2"></i>
          <p className="text-xs text-slate-600">Calculator</p>
        </div>
        <div className="text-center">
          <i className="fas fa-chart-line text-2xl text-primary mb-2"></i>
          <p className="text-xs text-slate-600">Graphs</p>
        </div>
        <div className="text-center">
          <i className="fas fa-brain text-2xl text-primary mb-2"></i>
          <p className="text-xs text-slate-600">Wolfram</p>
        </div>
        <div className="text-center">
          <i className="fas fa-shapes text-2xl text-primary mb-2"></i>
          <p className="text-xs text-slate-600">Shapes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tools Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-white">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center">
          <i className="fas fa-tools text-primary mr-2"></i>
          Math Tools
        </h2>
      </div>

      {/* Tool Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="flex-shrink-0 grid w-full grid-cols-4 rounded-none border-b bg-white">
          <TabsTrigger 
            value="calculator" 
            className="text-xs px-2 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
            data-testid="tab-calculator"
          >
            <i className="fas fa-calculator mr-1"></i>
            Calculator
          </TabsTrigger>
          <TabsTrigger 
            value="graphs" 
            className="text-xs px-2 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
            data-testid="tab-graphs"
          >
            <i className="fas fa-chart-line mr-1"></i>
            Graphs
          </TabsTrigger>
          <TabsTrigger 
            value="wolfram" 
            className="text-xs px-2 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
            data-testid="tab-wolfram"
          >
            <i className="fas fa-brain mr-1"></i>
            Wolfram
          </TabsTrigger>
          <TabsTrigger 
            value="shapes" 
            className="text-xs px-2 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
            data-testid="tab-shapes"
          >
            <i className="fas fa-shapes mr-1"></i>
            Shapes
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="calculator" className="h-full m-0 p-4 overflow-y-auto">
            <Calculator />
          </TabsContent>
          
          <TabsContent value="graphs" className="h-full m-0 p-4 overflow-y-auto">
            <GraphTool 
              onSendToChat={sendToChatWithPayload} 
              initialFunction={currentGraphData?.functions || graphFunctions}
              initialRange={currentGraphData?.range || graphRange}
              key={currentGraphData ? JSON.stringify(currentGraphData) : 'default'}
            />
          </TabsContent>
          
          <TabsContent value="wolfram" className="h-full m-0 p-4 overflow-y-auto">
            <WolframTool onSendToChat={sendToChatWithPayload} />
          </TabsContent>
          
          <TabsContent value="shapes" className="h-full m-0 p-0 overflow-hidden">
            <ShapesTab 
              highlightTriangleType={highlightTriangleType}
              customVertices={customVertices}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
