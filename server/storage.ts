import {
  users,
  tutorSessions,
  messages,
  generatedPapers,
  paperTemplates,
  resourceDocs,
  type User,
  type UpsertUser,
  type TutorSession,
  type InsertTutorSession,
  type Message,
  type InsertMessage,
  type GeneratedPaper,
  type InsertGeneratedPaper,
  type PaperTemplate,
  type InsertPaperTemplate,
  type ResourceDoc,
  type InsertResourceDoc,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Local authentication operations
  getUserByEmail(email: string): Promise<User | undefined>;
  createLocalUser(user: { email: string; firstName: string; lastName: string; password: string }): Promise<User>;
  
  // Tutor session operations
  getTutorSession(id: string): Promise<TutorSession | undefined>;
  getTutorSessionsByUser(userId: string): Promise<TutorSession[]>;
  createTutorSession(session: InsertTutorSession): Promise<TutorSession>;
  updateTutorSession(id: string, updates: Partial<TutorSession>): Promise<TutorSession>;
  
  // Message operations
  getMessagesBySession(sessionId: string, limit?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getLatestMessages(sessionId: string, limit: number): Promise<Message[]>;
  
  // Paper generator operations
  createGeneratedPaper(paper: InsertGeneratedPaper): Promise<GeneratedPaper>;
  getGeneratedPaper(id: string): Promise<GeneratedPaper | undefined>;
  getGeneratedPapersByUser(userId: string): Promise<GeneratedPaper[]>;
  updateGeneratedPaper(id: string, updates: Partial<GeneratedPaper>): Promise<GeneratedPaper>;
  
  // Paper template operations
  createPaperTemplate(template: InsertPaperTemplate): Promise<PaperTemplate>;
  getPaperTemplates(): Promise<PaperTemplate[]>;
  
  // Resource doc operations
  createResourceDoc(doc: InsertResourceDoc): Promise<ResourceDoc>;
  getResourceDocs(): Promise<ResourceDoc[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Local authentication operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createLocalUser(userData: { email: string; firstName: string; lastName: string; password: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        isLocalUser: true,
      })
      .returning();
    return user;
  }

  // Tutor session operations
  async getTutorSession(id: string): Promise<TutorSession | undefined> {
    const [session] = await db
      .select()
      .from(tutorSessions)
      .where(eq(tutorSessions.id, id));
    return session;
  }

  async getTutorSessionsByUser(userId: string): Promise<TutorSession[]> {
    return await db
      .select()
      .from(tutorSessions)
      .where(eq(tutorSessions.userId, userId))
      .orderBy(desc(tutorSessions.updatedAt));
  }

  async createTutorSession(sessionData: InsertTutorSession): Promise<TutorSession> {
    const [session] = await db
      .insert(tutorSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async updateTutorSession(id: string, updates: Partial<TutorSession>): Promise<TutorSession> {
    const [session] = await db
      .update(tutorSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tutorSessions.id, id))
      .returning();
    return session;
  }

  // Message operations
  async getMessagesBySession(sessionId: string, limit = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async getLatestMessages(sessionId: string, limit: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  // Paper generator operations
  async createGeneratedPaper(paperData: InsertGeneratedPaper): Promise<GeneratedPaper> {
    const [paper] = await db
      .insert(generatedPapers)
      .values(paperData)
      .returning();
    return paper;
  }

  async getGeneratedPaper(id: string): Promise<GeneratedPaper | undefined> {
    const [paper] = await db
      .select()
      .from(generatedPapers)
      .where(eq(generatedPapers.id, id));
    return paper;
  }

  async getGeneratedPapersByUser(userId: string): Promise<GeneratedPaper[]> {
    return await db
      .select()
      .from(generatedPapers)
      .where(eq(generatedPapers.userId, userId))
      .orderBy(desc(generatedPapers.createdAt));
  }

  async updateGeneratedPaper(id: string, updates: Partial<GeneratedPaper>): Promise<GeneratedPaper> {
    const [paper] = await db
      .update(generatedPapers)
      .set(updates)
      .where(eq(generatedPapers.id, id))
      .returning();
    return paper;
  }

  // Paper template operations
  async createPaperTemplate(templateData: InsertPaperTemplate): Promise<PaperTemplate> {
    const [template] = await db
      .insert(paperTemplates)
      .values(templateData)
      .returning();
    return template;
  }

  async getPaperTemplates(): Promise<PaperTemplate[]> {
    return await db
      .select()
      .from(paperTemplates)
      .orderBy(desc(paperTemplates.createdAt));
  }

  // Resource doc operations
  async createResourceDoc(docData: InsertResourceDoc): Promise<ResourceDoc> {
    const [doc] = await db
      .insert(resourceDocs)
      .values(docData)
      .returning();
    return doc;
  }

  async getResourceDocs(): Promise<ResourceDoc[]> {
    return await db
      .select()
      .from(resourceDocs)
      .orderBy(desc(resourceDocs.createdAt));
  }
}

export const storage = new DatabaseStorage();
