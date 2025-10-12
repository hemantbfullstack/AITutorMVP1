export interface HardcodedCriteria {
  id: string;
  name: string;
  description: string;
  educationalBoard: string;
  subject: string;
  level: string;
  totalChunks: number;
  totalTokens: number;
}

export const HARDCODED_CRITERIA: HardcodedCriteria[] = [
  {
    id: "math-aa-sl",
    name: "IB Mathematics AA SL",
    description: "International Baccalaureate Analysis and Approaches Standard Level",
    educationalBoard: "IB",
    subject: "Mathematics",
    level: "AA SL",
    totalChunks: 120,
    totalTokens: 40000
  },
  {
    id: "math-aa-hl",
    name: "IB Mathematics AA HL",
    description: "International Baccalaureate Analysis and Approaches Higher Level",
    educationalBoard: "IB",
    subject: "Mathematics",
    level: "AA HL",
    totalChunks: 150,
    totalTokens: 50000
  },
  {
    id: "math-ai-sl",
    name: "IB Mathematics AI SL",
    description: "International Baccalaureate Applications and Interpretation Standard Level",
    educationalBoard: "IB",
    subject: "Mathematics",
    level: "AI SL",
    totalChunks: 130,
    totalTokens: 45000
  },
  {
    id: "math-ai-hl",
    name: "IB Mathematics AI HL",
    description: "International Baccalaureate Applications and Interpretation Higher Level",
    educationalBoard: "IB",
    subject: "Mathematics",
    level: "AI HL",
    totalChunks: 160,
    totalTokens: 55000
  }
];

export function getHardcodedCriteria(criteriaId: string): HardcodedCriteria | null {
  return HARDCODED_CRITERIA.find(c => c.id === criteriaId) || null;
}

export function isHardcodedCriteria(criteriaId: string): boolean {
  return HARDCODED_CRITERIA.some(c => c.id === criteriaId);
}
