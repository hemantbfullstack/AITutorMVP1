import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ChatArea from "@/components/chat/ChatArea";
import MathToolsModal from "@/components/tools/MathToolsModal";
import { UIAction } from "@/lib/intentDetector";
import { TriangleType } from "@/components/tools/shapes/TriangleDrawer";
import MainLayout from "@/components/layout/mainLayout";

export default function Tutor() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const [showMathTools, setShowMathTools] = useState(false);
  const [visualState, setVisualState] = useState<{
    highlightTriangleType?: TriangleType;
    customVertices?: [number, number][];
    openShapesTab?: boolean;
    functionExpression?: string;
    graphFunctions?: string[];
    graphRange?: [number, number];
  }>({});

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleVisualTrigger = (action: UIAction) => {
    if (action.type === "triangle") {
      setVisualState({
        highlightTriangleType: action.variant,
        customVertices: action.vertices,
        openShapesTab: true,
      });
      setShowMathTools(true);
    } else if (action.type === "graph") {
      setVisualState({
        functionExpression: action.functions?.[0] || action.func,
        graphFunctions: action.functions,
        graphRange: action.range,
      });
      setShowMathTools(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  const handleLogout = () => {
    logout();
    // The useAuth hook will clear localStorage and redirect
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="pt-16 min-h-screen">
          {/* Main Chat Area */}
          <div className="w-full">
            <ChatArea
              onToggleMobileTools={() => setShowMathTools(!showMathTools)}
              onTriggerVisual={handleVisualTrigger}
            />
          </div>

          {/* Math Tools Modal */}
          <MathToolsModal
            isOpen={showMathTools}
            onClose={() => setShowMathTools(false)}
            highlightTriangleType={visualState.highlightTriangleType}
            customVertices={visualState.customVertices}
            openShapesTab={visualState.openShapesTab}
            graphFunctions={visualState.graphFunctions}
            graphRange={visualState.graphRange}
          />
        </div>
      </div>
    </MainLayout>
  );
}
