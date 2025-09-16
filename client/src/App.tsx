import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppRouter from "@/router/AppRouter";

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
