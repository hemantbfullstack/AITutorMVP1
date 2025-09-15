// src/utils/fileProcessor.ts
import fs from "fs/promises";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export interface ProcessedFile {
  text: string;
  chunks: string[];
  tokenCount: number;
  size: number;
  processedAt: Date;
}

export const processFile = async (
  filePath: string,
  originalName: string
): Promise<ProcessedFile> => {
  const ext = path.extname(originalName).toLowerCase();

  try {
    let text = "";

    switch (ext) {
      case ".pdf":
        text = await processPDF(filePath);
        break;
      case ".txt":
        text = await processTXT(filePath);
        break;
      case ".docx":
        text = await processDOCX(filePath);
        break;
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }

    // Clean text
    text = cleanText(text);

    // Split into chunks
    const chunks = splitText(text, 500);

    // Get file stats
    const stats = await fs.stat(filePath);

    return {
      text,
      chunks,
      tokenCount: countTokens(text),
      size: stats.size,
      processedAt: new Date(),
    };
  } catch (error: any) {
    console.error("❌ Error processing file:", error);
    throw error;
  }
};

// ---------------- PDF ----------------
const processPDF = async (filePath: string): Promise<string> => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error: any) {
    throw new Error(`Failed to process PDF: ${error.message}`);
  }
};

// ---------------- TXT ----------------
const processTXT = async (filePath: string): Promise<string> => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error: any) {
    throw new Error(`Failed to process TXT: ${error.message}`);
  }
};

// ---------------- DOCX ----------------
const processDOCX = async (filePath: string): Promise<string> => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error: any) {
    throw new Error(`Failed to process DOCX: ${error.message}`);
  }
};

// ---------------- Helpers ----------------
export const cleanText = (text: string): string => {
  return text
    .replace(/\s+/g, " ") // multiple spaces → one
    .replace(/\n\s*\n/g, "\n") // multiple newlines → one
    .trim();
};

export function splitText(text: string, maxLength = 500): string[] {
  const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  const chunks: string[] = [];
  let chunk = "";

  for (const sentence of sentences) {
    if ((chunk + sentence).length > maxLength) {
      chunks.push(chunk.trim());
      chunk = sentence;
    } else {
      chunk += sentence;
    }
  }

  if (chunk) chunks.push(chunk.trim());
  return chunks;
}

export function countTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 chars
  return Math.ceil(text.length / 4);
}

// ---------------- File Save / Delete ----------------
export const saveFile = async (
  file: Express.Multer.File,
  uploadPath: string
): Promise<{ filename: string; filePath: string; originalName: string; size: number }> => {
  try {
    await fs.mkdir(uploadPath, { recursive: true });

    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}_${file.originalname}`;
    const filePath = path.join(uploadPath, filename);

    await fs.writeFile(filePath, file.buffer);

    return {
      filename,
      filePath,
      originalName: file.originalname,
      size: file.size,
    };
  } catch (error) {
    console.error("❌ Error saving file:", error);
    throw error;
  }
};

export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error("⚠️ Error deleting file:", error);
    // Do not throw, just log
  }
};
