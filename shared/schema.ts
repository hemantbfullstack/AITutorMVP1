import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Local development authentication fields
  password: varchar("password"), // For local development login
  isLocalUser: boolean("is_local_user").default(false), // Flag to identify local vs Replit users
  role: varchar("role").default("student").notNull(), // Add this line
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),   
  planId: varchar("plan_id").default("free").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  usageResetAt: timestamp("usage_reset_at"),
  // New fields for enhanced plan features
  imageUsageCount: integer("image_usage_count").default(0).notNull(),
  voiceUsageCount: integer("voice_usage_count").default(0).notNull(),
  paperUsageCount: integer("paper_usage_count").default(0).notNull(),
});

// Add role enum type
export const userRoleEnum = z.enum(["admin", "teacher", "student"]);
export type UserRole = z.infer<typeof userRoleEnum>;

// Tutor sessions
export const tutorSessions = pgTable("tutor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: varchar("title"),
  ibSubject: varchar("ib_subject").notNull(), // "AA" | "AI"
  ibLevel: varchar("ib_level").notNull(), // "HL" | "SL"
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages in tutor sessions
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: varchar("role").notNull(), // "user" | "assistant" | "system"
  content: text("content").notNull(),
  image: text("image"), // data URL for inline images
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tutorSessions: many(tutorSessions),
  messages: many(messages),
}));

export const tutorSessionsRelations = relations(tutorSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [tutorSessions.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(tutorSessions, {
    fields: [messages.sessionId],
    references: [tutorSessions.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));

// IB Paper Generator tables
export const paperTemplates = pgTable("paper_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name"),
  metaJson: jsonb("meta_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const generatedPapers = pgTable("generated_papers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  subject: varchar("subject").notNull(), // "AA" | "AI"
  level: varchar("level").notNull(), // "HL" | "SL"
  paperType: varchar("paper_type").notNull(), // "P1" | "P2"
  topics: text("topics").array(), // selected syllabus topics
  questionsJson: jsonb("questions_json").notNull(), // [{qId, prompt, marks, calcAllowed, commandTerm, topicTag}]
  markschemeJson: jsonb("markscheme_json").notNull(), // [{qId, steps:[{text, marks}], totalMarks}]
  totalMarks: integer("total_marks").notNull(),
  pdfUrl: varchar("pdf_url"),
  msPdfUrl: varchar("ms_pdf_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const resourceDocs = pgTable("resource_docs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  url: varchar("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Additional relations
export const generatedPapersRelations = relations(generatedPapers, ({ one }) => ({
  user: one(users, {
    fields: [generatedPapers.userId],
    references: [users.id],
  }),
}));

export const usersRelationsExtended = relations(users, ({ many }) => ({
  tutorSessions: many(tutorSessions),
  messages: many(messages),
  generatedPapers: many(generatedPapers),
}));

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Local authentication schemas
export const localSignupSchema = createInsertSchema(users, {
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
}).pick({
  email: true,
  firstName: true,
  lastName: true,
  password: true,
});

export const localLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LocalSignup = z.infer<typeof localSignupSchema>;
export type LocalLogin = z.infer<typeof localLoginSchema>;
export type InsertTutorSession = typeof tutorSessions.$inferInsert;
export type TutorSession = typeof tutorSessions.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertPaperTemplate = typeof paperTemplates.$inferInsert;
export type PaperTemplate = typeof paperTemplates.$inferSelect;
export type InsertGeneratedPaper = typeof generatedPapers.$inferInsert;
export type GeneratedPaper = typeof generatedPapers.$inferSelect;
export type InsertResourceDoc = typeof resourceDocs.$inferInsert;
export type ResourceDoc = typeof resourceDocs.$inferSelect;

// Schemas
export const insertTutorSessionSchema = createInsertSchema(tutorSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const tutorMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  ibSubject: z.enum(["AA", "AI"]),
  ibLevel: z.enum(["HL", "SL"]),
  sessionId: z.string().nullable().optional(),
});

export const calcSchema = z.object({
  expression: z.string().min(1).max(500),
});

export const graphSchema = z.object({
  functions: z.array(z.string()).min(1).max(10),
  xRange: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
  yRange: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
});

export const wolframSchema = z.object({
  query: z.string().min(1).max(1000),
});

export const ttsSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().optional(), // OpenAI voice name
  model: z.string().optional(), // OpenAI TTS model
  format: z.enum(["mp3", "wav", "ogg"]).optional(),
});

// IB Paper Generator schemas
export const generatePaperSchema = z.object({
  subject: z.enum(["AA", "AI"]),
  level: z.enum(["HL", "SL"]),
  paperType: z.enum(["P1", "P2"]),
  numQuestions: z.number().min(3).max(15),
  topics: z.array(z.string()).optional(),
  calcAllowed: z.boolean().optional(),
});

export const insertGeneratedPaperSchema = createInsertSchema(generatedPapers).omit({
  id: true,
  createdAt: true,
});

export const insertPaperTemplateSchema = createInsertSchema(paperTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertResourceDocSchema = createInsertSchema(resourceDocs).omit({
  id: true,
  createdAt: true,
});
