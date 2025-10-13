// Tutor definitions - AA/AI selection tied to tutor
export interface Tutor {
  id: string;
  name: string;
  description: string;
  educationalBoard: string;
  subject: string;
  tutorType: "AA" | "AI"; // Analysis & Approaches or Applications & Interpretation
  knowledgeBaseId: string; // Links to the KB that contains both SL and HL content
  totalChunks: number;
  totalTokens: number;
}

// Criteria definitions - Only SL/HL levels
export interface Criteria {
  id: string;
  name: string;
  description: string;
  level: "SL" | "HL";
  tutorId: string; // Links to the tutor
}

export const TUTORS: Tutor[] = [
  {
    id: "tutor-aa",
    name: "IB Mathematics AA Tutor",
    description: "Analysis and Approaches - Focus on pure mathematics, calculus, and analytical methods",
    educationalBoard: "IB",
    subject: "Mathematics",
    tutorType: "AA",
    knowledgeBaseId: "kb-aa", // This KB contains both SL and HL content
    totalChunks: 270, // Combined SL + HL chunks
    totalTokens: 90000
  },
  {
    id: "tutor-ai",
    name: "IB Mathematics AI Tutor", 
    description: "Applications and Interpretation - Focus on applied mathematics, statistics, and real-world applications",
    educationalBoard: "IB",
    subject: "Mathematics",
    tutorType: "AI",
    knowledgeBaseId: "kb-ai", // This KB contains both SL and HL content
    totalChunks: 290, // Combined SL + HL chunks
    totalTokens: 100000
  }
];

export const CRITERIA: Criteria[] = [
  {
    id: "criteria-sl",
    name: "Standard Level",
    description: "Standard Level content and assessment criteria",
    level: "SL",
    tutorId: "tutor-aa" // Can be used with both tutors
  },
  {
    id: "criteria-hl",
    name: "Higher Level", 
    description: "Higher Level content and assessment criteria",
    level: "HL",
    tutorId: "tutor-aa" // Can be used with both tutors
  }
];

// Legacy interface for backward compatibility
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

// Legacy hardcoded criteria for backward compatibility
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

// New helper functions for tutor and criteria management
export function getTutor(tutorId: string): Tutor | null {
  return TUTORS.find(t => t.id === tutorId) || null;
}

export function getCriteria(criteriaId: string): Criteria | null {
  return CRITERIA.find(c => c.id === criteriaId) || null;
}

export function getCriteriaForTutor(tutorId: string): Criteria[] {
  return CRITERIA.filter(c => c.tutorId === tutorId);
}

export function getTutorByType(tutorType: "AA" | "AI"): Tutor | null {
  return TUTORS.find(t => t.tutorType === tutorType) || null;
}

export function isTutorId(tutorId: string): boolean {
  return TUTORS.some(t => t.id === tutorId);
}

export function isCriteriaId(criteriaId: string): boolean {
  return CRITERIA.some(c => c.id === criteriaId);
}

// Legacy functions for backward compatibility
export function getHardcodedCriteria(criteriaId: string): HardcodedCriteria | null {
  return HARDCODED_CRITERIA.find(c => c.id === criteriaId) || null;
}

export function isHardcodedCriteria(criteriaId: string): boolean {
  return HARDCODED_CRITERIA.some(c => c.id === criteriaId);
}
