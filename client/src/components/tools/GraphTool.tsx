import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, TrendingUp, Send, Brain, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Plot from "react-plotly.js";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface GraphFunction {
  id: string;
  expression: string;
  color: string;
  visible: boolean;
}

type ChatBridgePayload =
  | { kind: "graph"; expression: string; range: [number, number] }
  | { kind: "text"; text: string }
  | { kind: "image"; text: string; imageBase64: string };

interface GraphToolProps {
  onSendToChat?: (payload: ChatBridgePayload) => void;
  initialFunction?: string | string[];
  initialRange?: [number, number];
}

const colors = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", "#c2410c"];

export function GraphTool({ onSendToChat, initialFunction, initialRange }: GraphToolProps) {
  const { toast } = useToast();
  const [functions, setFunctions] = useState<GraphFunction[]>(() => {
    if (initialFunction) {
      // Support multiple functions from enhanced parser
      const funcs = Array.isArray(initialFunction) ? initialFunction : [initialFunction];
      return funcs.map((expr, index) => ({
        id: String(index + 1),
        expression: expr,
        color: colors[index % colors.length],
        visible: true
      }));
    }
    return [{ id: "1", expression: "x^2", color: colors[0], visible: true }];
  });
  const [xMin, setXMin] = useState(initialRange?.[0] ?? -10);
  const [xMax, setXMax] = useState(initialRange?.[1] ?? 10);
  const [yMin, setYMin] = useState(-10);
  const [yMax, setYMax] = useState(10);
  const [wolframQuery, setWolframQuery] = useState("plot y = sin(x) from -2pi to 2pi");
  const [wolframImage, setWolframImage] = useState<string | null>(null);
  const [wolframSteps, setWolframSteps] = useState<any[]>([]);
  const [sendToChatEnabled, setSendToChatEnabled] = useState(true);

  // Wolfram Alpha Simple API mutation for images
  const wolframSimpleMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch("/api/wolfram/simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setWolframImage(data.imageBase64);
      toast({
        title: "Wolfram Plot Generated",
        description: "Graph generated successfully via Wolfram Alpha",
      });
      
      // Send to chat if enabled
      if (sendToChatEnabled && onSendToChat) {
        const message = `Rendered graph: ${wolframQuery}`;
        onSendToChat({ kind: "image", text: message, imageBase64: data.imageBase64 });
      }
    },
    onError: (error: Error) => {
      console.error("Wolfram API error:", error);
      
      if (error.message.includes("WOLFRAM_APP_ID not configured")) {
        toast({
          title: "Wolfram Alpha Not Configured",
          description: "Please add your WOLFRAM_APP_ID to Replit secrets",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Wolfram Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Wolfram Alpha Full API mutation for structured data with steps
  const wolframFullMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch("/api/wolfram/full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setWolframSteps(data.pods || []);
      toast({
        title: "Wolfram Analysis Complete",
        description: "Step-by-step solution retrieved",
      });
      
      // Send to chat if enabled
      if (sendToChatEnabled && onSendToChat) {
        const message = `🧮 Analyzed your query via Wolfram: ${wolframQuery}`;
        onSendToChat({ kind: "text", text: message });
      }
    },
    onError: (error: Error) => {
      console.error("Wolfram Full API error:", error);
      
      if (error.message.includes("WOLFRAM_APP_ID not configured")) {
        toast({
          title: "Wolfram Alpha Not Configured",
          description: "Please add your WOLFRAM_APP_ID to Replit secrets",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Wolfram Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const addFunction = () => {
    const newId = String(functions.length + 1);
    const colorIndex = functions.length % colors.length;
    setFunctions([
      ...functions,
      {
        id: newId,
        expression: "",
        color: colors[colorIndex],
        visible: true
      }
    ]);
  };

  const updateFunction = (id: string, expression: string) => {
    setFunctions(functions.map(f =>
      f.id === id ? { ...f, expression } : f
    ));
  };

  const removeFunction = (id: string) => {
    if (functions.length > 1) {
      setFunctions(functions.filter(f => f.id !== id));
    }
  };

  const toggleFunction = (id: string) => {
    setFunctions(functions.map(f =>
      f.id === id ? { ...f, visible: !f.visible } : f
    ));
  };

  const generatePlotData = () => {
    const data: any[] = [];
    
    functions.forEach(func => {
      if (!func.visible || !func.expression.trim()) return;
      
      try {
        const x: number[] = [];
        const y: number[] = [];
        
        const step = (xMax - xMin) / 1000;
        
        for (let xi = xMin; xi <= xMax; xi += step) {
          try {
            // Simple expression evaluation - replace x with actual value
            let expr = func.expression
              .replace(/\^/g, '**')
              .replace(/sin/g, 'Math.sin')
              .replace(/cos/g, 'Math.cos')
              .replace(/tan/g, 'Math.tan')
              .replace(/log/g, 'Math.log10')
              .replace(/ln/g, 'Math.log')
              .replace(/sqrt/g, 'Math.sqrt')
              .replace(/pi/g, 'Math.PI')
              .replace(/e/g, 'Math.E')
              .replace(/abs/g, 'Math.abs')
              .replace(/\bx\b/g, `(${xi})`);
            
            const yi = eval(expr);
            
            if (isFinite(yi) && yi >= yMin && yi <= yMax) {
              x.push(xi);
              y.push(yi);
            }
          } catch {
            // Skip invalid points
          }
        }
        
        if (x.length > 0) {
          data.push({
            x,
            y,
            type: 'scatter',
            mode: 'lines',
            name: `f(x) = ${func.expression}`,
            line: { color: func.color, width: 2 }
          });
        }
      } catch (error) {
        console.warn(`Error plotting function ${func.expression}:`, error);
      }
    });
    
    return data;
  };

  const sendGraphToChat = () => {
    const visibleFunctions = functions.filter(f => f.visible && f.expression.trim());
    if (visibleFunctions.length > 0) {
      const expr = visibleFunctions.map(f => f.expression).join(", ");
      onSendToChat?.({
        kind: "graph",
        expression: expr,
        range: [xMin, xMax]
      });
    }
  };



  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Graph Tool</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={sendGraphToChat}
          data-testid="button-send-graph"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Functions</Label>
            <div className="space-y-2">
              {functions.map((func, index) => (
                <div key={func.id} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full cursor-pointer"
                    style={{ backgroundColor: func.color }}
                    onClick={() => toggleFunction(func.id)}
                    data-testid={`color-indicator-${index}`}
                  />
                  <Input
                    placeholder="Enter function (e.g., x^2, sin(x))"
                    value={func.expression}
                    onChange={(e) => updateFunction(func.id, e.target.value)}
                    className="flex-1"
                    data-testid={`input-function-${index}`}
                  />
                  {functions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFunction(func.id)}
                      data-testid={`button-remove-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addFunction}
              className="mt-2"
              data-testid="button-add-function"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Function
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-1 block">X Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={xMin}
                  onChange={(e) => setXMin(Number(e.target.value))}
                  placeholder="Min"
                  data-testid="input-x-min"
                />
                <Input
                  type="number"
                  value={xMax}
                  onChange={(e) => setXMax(Number(e.target.value))}
                  placeholder="Max"
                  data-testid="input-x-max"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">Y Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={yMin}
                  onChange={(e) => setYMin(Number(e.target.value))}
                  placeholder="Min"
                  data-testid="input-y-min"
                />
                <Input
                  type="number"
                  value={yMax}
                  onChange={(e) => setYMax(Number(e.target.value))}
                  placeholder="Max"
                  data-testid="input-y-max"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium">Interactive Plot</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => wolframSimpleMutation.mutate(wolframQuery)}
              disabled={wolframSimpleMutation.isPending}
              data-testid="button-wolfram-plot"
            >
              <Brain className="w-4 h-4 mr-1" />
              {wolframSimpleMutation.isPending ? "Generating..." : "Get Plot"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => wolframFullMutation.mutate(wolframQuery)}
              disabled={wolframFullMutation.isPending}
              data-testid="button-wolfram-steps"
            >
              <Brain className="w-4 h-4 mr-1" />
              {wolframFullMutation.isPending ? "Analyzing..." : "Get Steps"}
            </Button>
          </div>
        </div>
        <div style={{ width: "100%", height: "400px" }} data-testid="graph-container">
          <Plot
            data={generatePlotData()}
            layout={{
              title: "",
              xaxis: {
                title: "x",
                range: [xMin, xMax],
                showgrid: true,
                zeroline: true
              },
              yaxis: {
                title: "y",
                range: [yMin, yMax],
                showgrid: true,
                zeroline: true
              },
              showlegend: true,
              margin: { t: 30, r: 30, b: 50, l: 50 },
              plot_bgcolor: "#fafafa",
              paper_bgcolor: "transparent"
            }}
            config={{
              displayModeBar: false,
              responsive: true
            }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Wolfram Alpha Plot Generator</h4>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Query</Label>
            <Input
              value={wolframQuery}
              onChange={(e) => setWolframQuery(e.target.value)}
              placeholder="e.g., plot y = sin(x) from -2pi to 2pi"
              className="w-full"
              data-testid="input-wolfram-query"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-to-chat"
              checked={sendToChatEnabled}
              onCheckedChange={(checked) => setSendToChatEnabled(!!checked)}
              data-testid="checkbox-send-to-chat"
            />
            <Label htmlFor="send-to-chat" className="text-sm">
              Send results to chat automatically
            </Label>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => wolframSimpleMutation.mutate(wolframQuery)}
              disabled={wolframSimpleMutation.isPending || !wolframQuery.trim()}
              className="flex-1"
              data-testid="button-draw-wolfram"
            >
              {wolframSimpleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Drawing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Draw with Wolfram
                </>
              )}
            </Button>
            <Button
              onClick={() => wolframFullMutation.mutate(wolframQuery)}
              disabled={wolframFullMutation.isPending || !wolframQuery.trim()}
              variant="outline"
              className="flex-1"
              data-testid="button-analyze-wolfram"
            >
              {wolframFullMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Get Step-by-Step"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {wolframImage && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-2">Wolfram Alpha Professional Plot</h4>
          <img 
            src={wolframImage} 
            alt="Wolfram Alpha plot" 
            className="w-full rounded"
            data-testid="wolfram-plot-image"
          />
        </Card>
      )}

      {wolframSteps.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-4">Step-by-Step Solution</h4>
          <div className="space-y-4">
            {wolframSteps.map((pod, podIndex) => (
              <div key={podIndex} className="border rounded p-3">
                <h5 className="font-medium text-sm mb-2">{pod.title}</h5>
                {pod.subpods.map((subpod: any, subpodIndex: number) => (
                  <div key={subpodIndex} className="mb-2">
                    {subpod.title && (
                      <h6 className="text-xs font-medium text-muted-foreground mb-1">
                        {subpod.title}
                      </h6>
                    )}
                    {subpod.plaintext && (
                      <div className="text-sm font-mono bg-muted p-2 rounded whitespace-pre-wrap">
                        {subpod.plaintext}
                      </div>
                    )}
                    {subpod.img && (
                      <img 
                        src={subpod.img.src} 
                        alt={subpod.img.alt || "Wolfram result"}
                        className="mt-2 max-w-full rounded"
                        style={{ maxWidth: "400px" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="text-sm text-muted-foreground">
        <p className="mb-1">Supported functions:</p>
        <p>Basic: +, -, *, /, ^(power)</p>
        <p>Trigonometric: sin(x), cos(x), tan(x)</p>
        <p>Other: log(x), ln(x), sqrt(x), abs(x), pi, e</p>
      </div>
    </div>
  );
}