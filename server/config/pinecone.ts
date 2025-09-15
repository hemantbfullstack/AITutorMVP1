import { Pinecone, Index } from "@pinecone-database/pinecone";

let pinecone: Pinecone | null = null;
let index: Index | null = null;

export const initializePinecone = async (): Promise<void> => {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME || !process.env.PINECONE_HOST) {
    console.warn("⚠️ Pinecone config missing. Vector search will be disabled.");
    return;
  }

  try {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    index = pinecone.index(
      process.env.PINECONE_INDEX_NAME!,
      process.env.PINECONE_HOST!
    );

    console.log("✅ Pinecone initialized successfully:", process.env.PINECONE_INDEX_NAME);
  } catch (error) {
    console.error("❌ Pinecone initialization error:", error);
    throw error;
  }
};

export const getIndex = (): Index | null => {
  if (!index) {
    console.warn("⚠️ Pinecone not initialized. Knowledge base functionality will be limited.");
    return null;
  }
  return index;
};

export const isPineconeAvailable = (): boolean => {
  return index !== null;
};
