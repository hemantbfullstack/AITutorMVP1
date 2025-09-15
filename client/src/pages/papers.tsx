import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  FileDown,
  Timer,
  Eye,
  BookOpen,
  Calculator,
  BarChart3,
} from "lucide-react";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface GeneratedPaper {
  id: string;
  subject: "AA" | "AI";
  level: "HL" | "SL";
  paperType: "P1" | "P2";
  topics: string[];
  questionsJson: PaperQuestion[];
  markschemeJson: QuestionMarkscheme[];
  totalMarks: number;
  createdAt: string;
}

interface PaperQuestion {
  qId: string;
  topic: string;
  commandTerm: string;
  marks: number;
  calcAllowed: boolean;
  prompt: string;
  data?: string;
  answerType: string;
}

interface QuestionMarkscheme {
  qId: string;
  totalMarks: number;
  steps: Array<{
    label: string;
    text: string;
    marks: number;
  }>;
}

const IB_TOPICS = {
  AA: [
    "Algebra",
    "Functions",
    "Calculus",
    "Probability and Statistics",
    "Geometry and Trigonometry",
    "Vectors",
  ],
  AI: [
    "Number and Algebra",
    "Functions",
    "Geometry and Trigonometry",
    "Statistics and Probability",
    "Calculus",
  ],
};

export default function Papers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

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

  // Generation form state
  const [formData, setFormData] = useState({
    subject: "AA" as "AA" | "AI",
    level: "HL" as "HL" | "SL",
    paperType: "P1" as "P1" | "P2",
    numQuestions: 5,
    topics: [] as string[],
  });

  // Current paper preview
  const [selectedPaper, setSelectedPaper] = useState<GeneratedPaper | null>(
    null
  );
  const [showMarkscheme, setShowMarkscheme] = useState(false);

  // Fetch user's papers
  const { data: papers = [], isLoading: papersLoading } = useQuery<
    GeneratedPaper[]
  >({
    queryKey: ["/api/papers"],
    queryFn: async () => {
      const response = await fetch("/api/papers", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch papers");
      }
      return response.json();
    },
    retry: false,
  });

  // Generate paper mutation
  const generateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("/api/papers/generate", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: async (result: any) => {
      const paperId = result.paperId;

      // Fetch the generated paper
      const paper = await apiRequest(`/api/papers/${paperId}`);
      setSelectedPaper(paper as GeneratedPaper);

      // Refetch papers list
      queryClient.invalidateQueries({ queryKey: ["/api/papers"] });

      toast({
        title: "Paper Generated",
        description:
          "Your IB Mathematics paper has been generated successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Generation Failed",
        description:
          error instanceof Error ? error.message : "Failed to generate paper",
        variant: "destructive",
      });
    },
  });

  // Download PDF mutation
  const downloadMutation = useMutation({
    mutationFn: async ({
      paperId,
      type,
    }: {
      paperId: string;
      type: "paper" | "markscheme";
    }) => {
      const response = await fetch(`/api/papers/${paperId}/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      return response.blob();
    },
    onSuccess: (blob, variables) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedPaper?.subject}_${selectedPaper?.level}_${selectedPaper?.paperType}_${variables.type}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `${
          variables.type === "paper" ? "Paper" : "Markscheme"
        } PDF download started.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    },
  });

  const handleTopicToggle = (topic: string) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  const handleGenerate = () => {
    generateMutation.mutate(formData);
  };

  const renderMathContent = (text: string) => {
    // Simple LaTeX detection and rendering
    const latexRegex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
    const parts = text.split(latexRegex);

    return parts.map((part, index) => {
      if (index % 3 === 1) {
        // Block math ($$...$$)
        return <BlockMath key={index} math={part} />;
      } else if (index % 3 === 2) {
        // Inline math ($...$)
        return <InlineMath key={index} math={part} />;
      } else {
        // Regular text
        return <span key={index}>{part}</span>;
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              IB Mathematics Paper Generator
            </h1>
            <p className="text-gray-600">
              Generate authentic IB-style mathematics papers with automated
              markschemes
            </p>
          </div>

          <Tabs defaultValue="generate" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Generate New Paper
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                My Papers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Generation Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Paper Configuration</CardTitle>
                    <CardDescription>
                      Configure your IB Mathematics paper settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="subject">Subject</Label>
                        <select
                          id="subject"
                          className="w-full mt-1 p-2 border rounded-md"
                          value={formData.subject}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              subject: e.target.value as "AA" | "AI",
                            }))
                          }
                          data-testid="select-subject"
                        >
                          <option value="AA">Analysis & Approaches (AA)</option>
                          <option value="AI">
                            Applications & Interpretation (AI)
                          </option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="level">Level</Label>
                        <select
                          id="level"
                          className="w-full mt-1 p-2 border rounded-md"
                          value={formData.level}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              level: e.target.value as "HL" | "SL",
                            }))
                          }
                          data-testid="select-level"
                        >
                          <option value="HL">Higher Level (HL)</option>
                          <option value="SL">Standard Level (SL)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="paperType">Paper Type</Label>
                        <select
                          id="paperType"
                          className="w-full mt-1 p-2 border rounded-md"
                          value={formData.paperType}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              paperType: e.target.value as "P1" | "P2",
                            }))
                          }
                          data-testid="select-paper-type"
                        >
                          <option value="P1">Paper 1 (No calculator)</option>
                          <option value="P2">
                            Paper 2 (Calculator allowed)
                          </option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="numQuestions">
                          Number of Questions
                        </Label>
                        <Input
                          id="numQuestions"
                          type="number"
                          min="3"
                          max="15"
                          value={formData.numQuestions}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              numQuestions: parseInt(e.target.value),
                            }))
                          }
                          data-testid="input-num-questions"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Topics (Optional)</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {IB_TOPICS[formData.subject].map((topic) => (
                          <button
                            key={topic}
                            onClick={() => handleTopicToggle(topic)}
                            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                              formData.topics.includes(topic)
                                ? "bg-blue-500 text-white border-blue-500"
                                : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                            }`}
                            data-testid={`topic-${topic
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending}
                      className="w-full"
                      data-testid="button-generate-paper"
                    >
                      {generateMutation.isPending
                        ? "Generating..."
                        : "Generate Paper"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Paper Preview */}
                {selectedPaper && (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>
                            {selectedPaper.subject} {selectedPaper.level} Paper{" "}
                            {selectedPaper.paperType.slice(1)}
                          </CardTitle>
                          <CardDescription>
                            {selectedPaper.totalMarks} marks •{" "}
                            {selectedPaper.questionsJson.length} questions
                            {selectedPaper.paperType === "P1"
                              ? " • No calculator"
                              : " • Calculator allowed"}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMarkscheme(!showMarkscheme)}
                            data-testid="button-toggle-markscheme"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            {showMarkscheme ? "Hide" : "Show"} Markscheme
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadMutation.mutate({
                              paperId: selectedPaper.id,
                              type: "paper",
                            })
                          }
                          disabled={downloadMutation.isPending}
                          data-testid="button-download-paper"
                        >
                          <FileDown className="w-4 h-4 mr-1" />
                          Download Paper
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadMutation.mutate({
                              paperId: selectedPaper.id,
                              type: "markscheme",
                            })
                          }
                          disabled={downloadMutation.isPending}
                          data-testid="button-download-markscheme"
                        >
                          <FileDown className="w-4 h-4 mr-1" />
                          Download Markscheme
                        </Button>
                      </div>

                      <div className="space-y-6 max-h-96 overflow-y-auto">
                        {selectedPaper.questionsJson.map((question, index) => (
                          <div key={question.qId} className="border-b pb-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-lg">
                                {index + 1}.
                              </h4>
                              <span className="text-sm text-gray-600 font-mono">
                                [{question.marks}]
                              </span>
                            </div>
                            <div className="prose prose-sm max-w-none">
                              {renderMathContent(question.prompt)}
                            </div>
                            {question.data && (
                              <div className="mt-2 text-gray-600 text-sm">
                                {renderMathContent(question.data)}
                              </div>
                            )}

                            {showMarkscheme && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                <h5 className="font-semibold text-sm text-gray-700 mb-2">
                                  Markscheme:
                                </h5>
                                {selectedPaper.markschemeJson
                                  .find((ms) => ms.qId === question.qId)
                                  ?.steps.map((step, stepIndex) => (
                                    <div
                                      key={stepIndex}
                                      className="flex justify-between items-start text-sm"
                                    >
                                      <span className="flex-1">
                                        <strong>{step.label}:</strong>{" "}
                                        {renderMathContent(step.text)}
                                      </span>
                                      <span className="font-mono text-gray-600 ml-2">
                                        [{step.marks}]
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>My Generated Papers</CardTitle>
                  <CardDescription>
                    Access your previously generated IB Mathematics papers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {papersLoading ? (
                    <div className="text-center py-8">Loading papers...</div>
                  ) : papers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No papers generated yet. Create your first paper using the
                      Generate tab.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {papers.map((paper) => (
                        <div
                          key={paper.id}
                          className="border rounded-lg p-4 hover:bg-gray-50"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">
                                {paper.subject} {paper.level} Paper{" "}
                                {paper.paperType.slice(1)}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {paper.totalMarks} marks •{" "}
                                {paper.questionsJson.length} questions
                              </p>
                              <p className="text-xs text-gray-500">
                                Generated:{" "}
                                {new Date(paper.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPaper(paper)}
                                data-testid={`button-preview-${paper.id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Preview
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  downloadMutation.mutate({
                                    paperId: paper.id,
                                    type: "paper",
                                  })
                                }
                                data-testid={`button-download-paper-${paper.id}`}
                              >
                                <FileDown className="w-4 h-4 mr-1" />
                                Paper
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  downloadMutation.mutate({
                                    paperId: paper.id,
                                    type: "markscheme",
                                  })
                                }
                                data-testid={`button-download-markscheme-${paper.id}`}
                              >
                                <FileDown className="w-4 h-4 mr-1" />
                                Markscheme
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
