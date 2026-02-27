import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const forms = sqliteTable('forms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  apiKey: text('api_key').notNull().unique(),
  allowedOrigins: text('allowed_origins').notNull().default('["*"]'),
  createdAt: integer('created_at').notNull().default(0),
});

export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(),
  formId: text('form_id').notNull(),
  data: text('data').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at').notNull().default(0),
});

export type Form = typeof forms.$inferSelect;
export type NewForm = typeof forms.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
