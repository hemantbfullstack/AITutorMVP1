import GeneratedPaper from '../models/GeneratedPaper.js';
import { paperGeneratorService } from '../utils/paperGenerator.js';

// Generate paper
const generatePaper = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { subject, level, paperType, numQuestions, topics, calcAllowed } = req.body;

    const actualCalcAllowed =
      calcAllowed !== undefined ? calcAllowed : paperType === "P2";


    const paperData = await paperGeneratorService.generatePaper(
      subject,
      level,
      paperType,
      numQuestions,
      topics
    );

    const totalMarks = paperGeneratorService.calculateTotalMarks(
      paperData.questions
    );

    const generatedPaper = new GeneratedPaper({
      userId,
      subject,
      level,
      paperType,
      topics: topics || [],
      questionsJson: paperData.questions,
      markschemeJson: paperData.markscheme,
      totalMarks,
    });

    await generatedPaper.save();

    res.json({ paperId: generatedPaper._id });
  } catch (error) {
    console.error("Paper generation error:", error);
    if (
      error instanceof Error &&
      error.message.includes("Paper generation failed")
    ) {
      res
        .status(500)
        .json({ error: "Failed to generate paper. Please try again." });
    } else {
      res.status(400).json({ error: "Invalid request parameters" });
    }
  }
};

// Generate PDF for paper
const generatePaperPDF = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { paperId } = req.params;
    const { type } = req.body; // "paper" | "markscheme"

    const paper = await GeneratedPaper.findById(paperId);

    if (!paper) {
      return res.status(404).json({ error: "Paper not found" });
    }

    if (paper.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const paperData = {
      questions: paper.questionsJson,
      markscheme: paper.markschemeJson,
    };

    let pdfBuffer;
    let filename;

    if (type === "markscheme") {
      pdfBuffer = await paperGeneratorService.generateMarkschemePDF(
        paperData,
        paper.subject,
        paper.level,
        paper.paperType
      );
      filename = `${paper.subject}_${paper.level}_${paper.paperType}_Markscheme.pdf`;
    } else {
      pdfBuffer = await paperGeneratorService.generatePaperPDF(
        paperData,
        paper.subject,
        paper.level,
        paper.paperType
      );
      filename = `${paper.subject}_${paper.level}_${paper.paperType}_Paper.pdf`;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};

export {
  generatePaper,
  generatePaperPDF
};
