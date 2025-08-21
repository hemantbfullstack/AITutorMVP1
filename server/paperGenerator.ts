import OpenAI from "openai";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "your-openai-key",
});

// IB Command Terms for different subjects and levels
const IB_COMMAND_TERMS = {
  AA: {
    HL: ["Solve", "Show that", "Hence", "Verify", "Prove", "Determine", "Find", "Sketch", "Evaluate", "Derive", "Justify"],
    SL: ["Solve", "Show that", "Find", "Determine", "Calculate", "Sketch", "Evaluate", "Write down"]
  },
  AI: {
    HL: ["Solve", "Find", "Determine", "Calculate", "Sketch", "Evaluate", "Interpret", "Explain", "Describe", "Compare"],
    SL: ["Find", "Calculate", "Determine", "Sketch", "Write down", "State", "Describe", "Explain"]
  }
};

// IB Topics for different subjects
const IB_TOPICS = {
  AA: ["Algebra", "Functions", "Calculus", "Probability and Statistics", "Geometry and Trigonometry", "Vectors"],
  AI: ["Number and Algebra", "Functions", "Geometry and Trigonometry", "Statistics and Probability", "Calculus"]
};

export interface PaperQuestion {
  qId: string;
  topic: string;
  commandTerm: string;
  marks: number;
  calcAllowed: boolean;
  prompt: string;
  data?: string;
  answerType: string;
}

export interface MarkschemeStep {
  label: string;
  text: string;
  marks: number;
}

export interface QuestionMarkscheme {
  qId: string;
  totalMarks: number;
  steps: MarkschemeStep[];
}

export interface GeneratedPaperContent {
  questions: PaperQuestion[];
  markscheme: QuestionMarkscheme[];
  notes?: string;
}

export class PaperGeneratorService {
  private buildSystemPrompt(
    subject: "AA" | "AI",
    level: "HL" | "SL", 
    paperType: "P1" | "P2",
    numQuestions: number,
    topics?: string[]
  ): string {
    const commandTerms = IB_COMMAND_TERMS[subject][level];
    const availableTopics = topics && topics.length > 0 ? topics : IB_TOPICS[subject];
    const calcAllowed = paperType === "P2";
    
    return `You are an expert IB Mathematics examiner creating authentic ${subject} ${level} Paper ${paperType.slice(1)} questions.

CRITICAL REQUIREMENTS:
1. Generate ONLY original questions - never copy existing IB questions
2. Follow strict IB style and difficulty standards
3. Use proper mathematical notation and LaTeX where appropriate
4. Ensure questions are appropriate for ${level} level
5. ${calcAllowed ? "Calculator allowed - include numerical/graphical elements" : "Non-calculator - emphasize algebraic/analytical methods"}

DIFFICULTY GUIDELINES:
${level === "SL" ? 
  "- SL: Shorter question chains, straightforward methods, 4-8 marks per question" :
  "- HL: Multi-step reasoning, possible proofs, 6-12 marks per question"
}

COMMAND TERMS TO USE: ${commandTerms.join(", ")}
TOPICS TO COVER: ${availableTopics.join(", ")}

OUTPUT FORMAT:
Return a valid JSON object with this exact structure:

{
  "questions": [
    {
      "qId": "Q1",
      "topic": "topic from the list above",
      "commandTerm": "command term from the list above", 
      "marks": number (appropriate for ${level}),
      "calcAllowed": ${calcAllowed},
      "prompt": "Complete question text with proper formatting",
      "data": "Any additional data/diagrams needed (optional)",
      "answerType": "worked" | "numerical" | "algebraic"
    }
    // ... ${numQuestions} questions total
  ],
  "markscheme": [
    {
      "qId": "Q1",
      "totalMarks": number,
      "steps": [
        {"label": "M1", "text": "Method mark description", "marks": 1},
        {"label": "A1", "text": "Accuracy mark description", "marks": 1}
        // Continue with M1, A1, etc. pattern
      ]
    }
    // ... markscheme for each question
  ],
  "notes": "Any special instructions or assumptions"
}

Generate exactly ${numQuestions} high-quality, original IB-style questions now.`;
  }

  async generatePaper(
    subject: "AA" | "AI",
    level: "HL" | "SL",
    paperType: "P1" | "P2", 
    numQuestions: number,
    topics?: string[]
  ): Promise<GeneratedPaperContent> {
    const systemPrompt = this.buildSystemPrompt(subject, level, paperType, numQuestions, topics);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the paper and markscheme as specified." }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content generated");
      }

      // Parse JSON response
      const paperData = JSON.parse(content) as GeneratedPaperContent;
      
      // Validate structure
      if (!paperData.questions || !paperData.markscheme) {
        throw new Error("Invalid paper structure generated");
      }

      if (paperData.questions.length !== numQuestions) {
        throw new Error(`Expected ${numQuestions} questions, got ${paperData.questions.length}`);
      }

      return paperData;
      
    } catch (error) {
      console.error("Error generating paper:", error);
      
      // Retry once with simplified prompt
      try {
        const retryResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: this.buildSystemPrompt(subject, level, paperType, numQuestions, topics) },
            { role: "user", content: "Generate simpler questions and ensure valid JSON output." }
          ],
          temperature: 0.5,
          max_tokens: 3000,
        });

        const retryContent = retryResponse.choices[0]?.message?.content;
        if (!retryContent) {
          throw new Error("Retry failed - no content");
        }

        return JSON.parse(retryContent) as GeneratedPaperContent;
        
      } catch (retryError) {
        throw new Error(`Paper generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async generatePaperPDF(
    paperData: GeneratedPaperContent,
    subject: "AA" | "AI",
    level: "HL" | "SL", 
    paperType: "P1" | "P2"
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(16).font('Helvetica-Bold');
      doc.text('International Baccalaureate', 50, 50);
      doc.text(`Mathematics: ${subject} ${level}`, 50, 70);
      doc.text(`Paper ${paperType.slice(1)}`, 50, 90);
      
      doc.fontSize(12).font('Helvetica');
      doc.text(`${paperType === "P1" ? "No calculator allowed" : "Calculator allowed"}`, 50, 110);
      
      // Instructions
      doc.moveDown(2);
      doc.text('Instructions to candidates:', 50, doc.y);
      doc.text('• Answer all questions', 70, doc.y + 15);
      doc.text('• Write your answers in the spaces provided', 70, doc.y + 15);
      doc.text('• Unless otherwise stated, all answers should be exact', 70, doc.y + 15);
      
      doc.moveDown(2);
      
      // Questions
      paperData.questions.forEach((question, index) => {
        if (doc.y > 700) {
          doc.addPage();
        }
        
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text(`${index + 1}.`, 50, doc.y + 20);
        
        doc.fontSize(12).font('Helvetica');
        doc.text(question.prompt, 70, doc.y, { width: 500 });
        
        // Add marks indication
        const marksY = doc.y;
        doc.text(`[${question.marks}]`, 520, marksY - 15, { width: 50, align: 'right' });
        
        if (question.data) {
          doc.text(question.data, 70, doc.y + 10, { width: 500 });
        }
        
        doc.moveDown(3);
      });

      doc.end();
    });
  }

  async generateMarkschemePDF(
    paperData: GeneratedPaperContent,
    subject: "AA" | "AI",
    level: "HL" | "SL",
    paperType: "P1" | "P2"
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(16).font('Helvetica-Bold');
      doc.text('MARKSCHEME', 50, 50);
      doc.text(`Mathematics: ${subject} ${level}`, 50, 70);
      doc.text(`Paper ${paperType.slice(1)}`, 50, 90);
      
      doc.moveDown(2);
      
      // Markscheme
      paperData.markscheme.forEach((ms, index) => {
        if (doc.y > 700) {
          doc.addPage();
        }
        
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text(`${index + 1}.`, 50, doc.y + 20);
        doc.text(`[${ms.totalMarks} marks]`, 500, doc.y - 15, { width: 100, align: 'right' });
        
        doc.fontSize(12).font('Helvetica');
        
        ms.steps.forEach(step => {
          doc.text(`${step.label}: ${step.text}`, 70, doc.y + 5);
          doc.text(`[${step.marks}]`, 520, doc.y - 15, { width: 50, align: 'right' });
          doc.moveDown(0.5);
        });
        
        doc.moveDown(2);
      });

      doc.end();
    });
  }

  // Calculate total marks from questions
  calculateTotalMarks(questions: PaperQuestion[]): number {
    return questions.reduce((total, q) => total + q.marks, 0);
  }
}

export const paperGeneratorService = new PaperGeneratorService();