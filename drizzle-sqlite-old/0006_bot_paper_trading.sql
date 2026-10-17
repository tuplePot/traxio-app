CREATE TABLE `bot_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`ai_enabled` integer DEFAULT true NOT NULL,
	`max_orders_per_day` integer DEFAULT 3 NOT NULL,
	`max_open_positions` integer DEFAULT 2 NOT NULL,
	`starting_balance` real DEFAULT 10000 NOT NULL,
	`expires_at` text NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bot_config_user_id_unique` ON `bot_config` (`user_id`);--> statement-breakpoint
CREATE TABLE `bot_decisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`symbol` text NOT NULL,
	`tier` text NOT NULL,
	`price` real,
	`ema20` real,
	`ema50` real,
	`ema200` real,
	`rsi` real,
	`macd_hist` real,
	`atr` real,
	`trend` text,
	`decision` text NOT NULL,
	`reason` text NOT NULL,
	`ai_verdict` text,
	`ai_confidence` integer,
	`ai_reason` text,
	`compliance` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bot_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`summary` text,
	`error` text,
	`ai_model` text,
	`started_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE TABLE `bot_symbols` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`symbol` text NOT NULL,
	`tier` text NOT NULL,
	`added_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bot_symbols_user_symbol_idx` ON `bot_symbols` (`user_id`,`symbol`);--> statement-breakpoint
CREATE TABLE `bot_worker` (
	`id` integer PRIMARY KEY NOT NULL,
	`last_seen_at` text NOT NULL,
	`next_run_at` text
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `paper_positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`symbol` text NOT NULL,
	`tier` text NOT NULL,
	`entry_price` real NOT NULL,
	`quantity` real NOT NULL,
	`notional` real NOT NULL,
	`stop_loss` real NOT NULL,
	`take_profit` real NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`exit_price` real,
	`exit_reason` text,
	`pnl` real,
	`trade_id` integer,
	`decision_id` integer,
	`opened_at` text NOT NULL,
	`closed_at` text
);
