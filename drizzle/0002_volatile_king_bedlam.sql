CREATE TABLE "serok_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"in_buy_zone" boolean DEFAULT false NOT NULL,
	"last_score" double precision,
	"last_alert_at" text,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_links" ADD COLUMN "notify_serok" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "serok_state_user_symbol_idx" ON "serok_state" USING btree ("user_id","symbol");