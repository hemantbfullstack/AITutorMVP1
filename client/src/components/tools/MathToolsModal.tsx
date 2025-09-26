import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X, Calculator as CalculatorIcon, TrendingUp, Brain, Shapes } from "lucide-react";
import { Calculator } from "./Calculator";
import { GraphTool } from "./GraphTool";
import { WolframTool } from "./WolframTool";
import { ShapesTab } from "./shapes/ShapesTab";
import { TriangleType } from "./shapes/TriangleDrawer";
import { onGraphRender, type GraphPayload } from "@/lib/graphBus";
import { useChat } from "@/hooks/useChat";

interface MathToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightTriangleType?: TriangleType;
  customVertices?: [number, number][];
  openShapesTab?: boolean;
  graphFunctions?: string[];
  graphRange?: [number, number];
}

export default function MathToolsModal({
  isOpen,
  onClose,
  highlightTriangleType,
  customVertices,
  openShapesTab,
  graphFunctions,
  graphRange,
}: MathToolsModalProps) {
  const [activeTab, setActiveTab] = useState(
    openShapesTab ? "shapes" : "calculator"
  );
  const [currentGraphData, setCurrentGraphData] = useState<{
    functions: string[];
    range: [number, number];
  } | null>(null);
  const { sendToChatWithPayload } = useChat();

  // Listen for real-time graph render events from chat
  useEffect(() => {
    return onGraphRender((payload: GraphPayload) => {
      setCurrentGraphData({
        functions: payload.functions,
        range: [payload.xmin, payload.xmax],
      });
      setActiveTab("graphs");
    });
  }, []);

  // Reset to calculator tab when modal opens
  useEffect(() => {
    if (isOpen && !openShapesTab) {
      setActiveTab("calculator");
    }
  }, [isOpen, openShapesTab]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalculatorIcon className="w-6 h-6" />
              Math Tools
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-xl transition-all duration-300 hover:scale-110"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <TabsList className="flex-shrink-0 grid w-full grid-cols-4 rounded-none border-b bg-gray-50">
              <TabsTrigger
                value="calculator"
                className="text-sm px-4 py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
                data-testid="tab-calculator"
              >
                <CalculatorIcon className="w-4 h-4 mr-2" />
                Calculator
              </TabsTrigger>
              <TabsTrigger
                value="graphs"
                className="text-sm px-4 py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
                data-testid="tab-graphs"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Graphs
              </TabsTrigger>
              <TabsTrigger
                value="wolfram"
                className="text-sm px-4 py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
                data-testid="tab-wolfram"
              >
                <Brain className="w-4 h-4 mr-2" />
                Wolfram
              </TabsTrigger>
              <TabsTrigger
                value="shapes"
                className="text-sm px-4 py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
                data-testid="tab-shapes"
              >
                <Shapes className="w-4 h-4 mr-2" />
                Shapes
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent
                value="calculator"
                className="h-full m-0 p-6 overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50"
              >
                <div className="w-full max-w-4xl mx-auto">
                  <Calculator onSendToChat={sendToChatWithPayload} />
                </div>
              </TabsContent>

              <TabsContent
                value="graphs"
                className="h-full m-0 p-6 overflow-y-auto bg-gradient-to-br from-gray-50 to-green-50"
              >
                <GraphTool
                  onSendToChat={sendToChatWithPayload}
                  initialFunction={currentGraphData?.functions || graphFunctions}
                  initialRange={currentGraphData?.range || graphRange}
                  key={
                    currentGraphData ? JSON.stringify(currentGraphData) : "default"
                  }
                />
              </TabsContent>

              <TabsContent
                value="wolfram"
                className="h-full m-0 p-6 overflow-y-auto bg-gradient-to-br from-gray-50 to-purple-50"
              >
                <WolframTool onSendToChat={sendToChatWithPayload} />
              </TabsContent>

              <TabsContent
                value="shapes"
                className="h-full m-0 p-0 overflow-hidden bg-gradient-to-br from-gray-50 to-orange-50"
              >
                <ShapesTab
                  highlightTriangleType={highlightTriangleType}
                  customVertices={customVertices}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
