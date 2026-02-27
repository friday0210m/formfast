import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const forms = pgTable('forms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  apiKey: text('api_key').notNull().unique(),
  allowedOrigins: jsonb('allowed_origins').notNull().default(['*']),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const submissions = pgTable('submissions', {
  id: text('id').primaryKey(),
  formId: text('form_id').notNull().references(() => forms.id),
  data: jsonb('data').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Form = typeof forms.$inferSelect;
export type NewForm = typeof forms.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
