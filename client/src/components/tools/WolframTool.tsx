import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Send, Brain, Loader2, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

interface WolframResult {
  query: string;
  result: string;
  image?: string;
  timestamp: number;
}

type ChatBridgePayload =
  | { kind: "graph"; expression: string; range: [number, number] }
  | { kind: "text"; text: string };

interface WolframToolProps {
  onSendToChat?: (payload: ChatBridgePayload) => void;
}

export function WolframTool({ onSendToChat }: WolframToolProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WolframResult[]>([]);

  const wolframMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch("/api/tools/wolfram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      const newResult: WolframResult = {
        query,
        result: data.result || "No result available",
        image: data.image,
        timestamp: Date.now(),
      };
      setResults((prev) => [newResult, ...prev.slice(0, 4)]); // Keep last 5 results
      setQuery("");
    },
    onError: (error) => {
      console.error("Wolfram query error:", error);
      const errorResult: WolframResult = {
        query,
        result:
          "Error: Unable to process query. Please check your connection and try again.",
        timestamp: Date.now(),
      };
      setResults((prev) => [errorResult, ...prev.slice(0, 4)]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      wolframMutation.mutate(query.trim());
    }
  };

  const sendResultToChat = (result: WolframResult) => {
    if (onSendToChat) {
      const message = `Wolfram Alpha Query: "${result.query}"\n\nResult: ${result.result}`;
      onSendToChat({ kind: "text", text: message });
    }
  };

  const exampleQueries = [
    "integrate x^2 from 0 to 5",
    "solve x^2 + 3x - 10 = 0",
    "derivative of sin(x^2)",
    "plot x^3 - 2x^2 + x",
    "limit of (sin x)/x as x approaches 0",
    "matrix [[1,2],[3,4]] * [[5,6],[7,8]]",
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Wolfram Alpha</h3>
        </div>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Ask Wolfram Alpha
            </Label>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter mathematical query (e.g., integrate x^2, solve x^2 + 2x = 0)"
                className="flex-1"
                disabled={wolframMutation.isPending}
                data-testid="input-wolfram-query"
              />
              <Button
                type="submit"
                disabled={!query.trim() || wolframMutation.isPending}
                data-testid="button-submit-query"
              >
                {wolframMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Example Queries
            </Label>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(example)}
                  disabled={wolframMutation.isPending}
                  className="text-xs"
                  data-testid={`button-example-${index}`}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {results.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Enter a mathematical query to get started with Wolfram Alpha</p>
            <p className="text-sm mt-1">
              Try queries like: "integrate x^2", "solve quadratic equations", or
              "plot functions"
            </p>
          </Card>
        ) : (
          results.map((result, index) => (
            <Card
              key={result.timestamp}
              className="p-4"
              data-testid={`result-${index}`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Query</span>
                    </div>
                    <p className="text-sm bg-muted p-2 rounded font-mono">
                      {result.query}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sendResultToChat(result)}
                    data-testid={`button-send-result-${index}`}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {result.result.startsWith("Error:") ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <span className="w-4 h-4 bg-accent rounded-full" />
                    )}
                    <span className="font-medium text-sm">Result</span>
                  </div>
                  <div className="text-sm p-3 bg-background border rounded">
                    {result.result.startsWith("Error:") ? (
                      <p className="text-destructive">{result.result}</p>
                    ) : (
                      <p className="whitespace-pre-wrap">{result.result}</p>
                    )}
                  </div>
                </div>

                {result.image && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-4 h-4 bg-primary rounded-full" />
                      <span className="font-medium text-sm">Visualization</span>
                    </div>
                    <div className="border rounded overflow-hidden">
                      <img
                        src={result.image}
                        alt="Wolfram Alpha result visualization"
                        className="w-full h-auto"
                        data-testid={`image-result-${index}`}
                      />
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="p-3 bg-muted/50">
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">Wolfram Alpha capabilities:</p>
          <ul className="text-xs space-y-1">
            <li>• Solve equations and systems</li>
            <li>• Calculate integrals and derivatives</li>
            <li>• Plot functions and data</li>
            <li>• Matrix operations</li>
            <li>• Statistical analysis</li>
            <li>• Unit conversions</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
