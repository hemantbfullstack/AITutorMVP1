import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import ChatArea from "@/components/chat/ChatArea";
import MathToolsSidebar from "@/components/tools/MathToolsSidebar";
import Navbar from "@/components/ui/navbar";
import { UIAction } from "@/lib/intentDetector";
import { TriangleType } from "@/components/tools/shapes/TriangleDrawer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MainLayout from "@/components/layout/mainLayout";

export default function Tutor() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const [showMobileTools, setShowMobileTools] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
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
      setShowMobileTools(true);
    } else if (action.type === "graph") {
      setVisualState({
        functionExpression: action.functions?.[0] || action.func,
        graphFunctions: action.functions,
        graphRange: action.range,
      });
      setShowMobileTools(true);
    }
  };

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const sidebarWidth = sidebarExpanded ? "w-96" : "w-20";
  const mainContentMargin = sidebarExpanded ? "lg:mr-96" : "lg:mr-20";

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
      <Navbar />
      
      <div className="pt-16 min-h-screen flex">
        {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col ${mainContentMargin}`}>
          <ChatArea 
            onToggleMobileTools={() => setShowMobileTools(!showMobileTools)}
            onTriggerVisual={handleVisualTrigger}
          />
        </div>

        {/* Math Tools Sidebar - Desktop */}
        <div className={`hidden lg:block ${sidebarWidth} bg-white border-l border-slate-200 fixed right-0 top-16 bottom-0 overflow-hidden transition-all duration-300 ease-in-out`}>
          {/* Sidebar Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="absolute -left-3 top-4 bg-white border border-slate-200 rounded-full p-1 shadow-md hover:shadow-lg transition-shadow z-10"
            title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarExpanded ? (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            )}
          </button>

          <MathToolsSidebar 
            highlightTriangleType={visualState.highlightTriangleType}
            customVertices={visualState.customVertices}
            openShapesTab={visualState.openShapesTab}
            graphFunctions={visualState.graphFunctions}
            graphRange={visualState.graphRange}
            isExpanded={sidebarExpanded}
          />
        </div>

        {/* Math Tools Drawer - Mobile */}
        {showMobileTools && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowMobileTools(false)}
          >
            <div 
              className="absolute right-0 top-0 bottom-0 w-96 max-w-full bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-full flex flex-col">
                {/* Mobile Header */}
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center">
                    <i className="fas fa-tools text-primary mr-2"></i>
                    Math Tools
                  </h2>
                  <button 
                    className="text-slate-500 hover:text-slate-700"
                    onClick={() => setShowMobileTools(false)}
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <MathToolsSidebar 
                    highlightTriangleType={visualState.highlightTriangleType}
                    customVertices={visualState.customVertices}
                    openShapesTab={visualState.openShapesTab}
                    graphFunctions={visualState.graphFunctions}
                    graphRange={visualState.graphRange}
                    isExpanded={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    
    </MainLayout>
    
  );
}
