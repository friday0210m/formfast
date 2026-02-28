-- Add user_email column to forms table
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "user_email" text;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "forms_user_email_idx" ON "forms" ("user_email");
