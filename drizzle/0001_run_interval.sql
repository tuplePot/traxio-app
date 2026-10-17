ALTER TABLE "bot_config" ADD COLUMN "run_interval_minutes" integer DEFAULT 240 NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_config" ADD COLUMN "next_run_at" text;--> statement-breakpoint
ALTER TABLE "telegram_links" ADD COLUMN "notify_run_summary" boolean DEFAULT true NOT NULL;