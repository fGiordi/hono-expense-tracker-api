ALTER TABLE "expenses" ADD COLUMN "date" timestamp;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "tags" jsonb DEFAULT '[]' NOT NULL;