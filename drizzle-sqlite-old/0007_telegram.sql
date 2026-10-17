CREATE TABLE `telegram_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`chat_id` text,
	`username` text,
	`link_code` text,
	`link_code_expires_at` text,
	`notify_buy` integer DEFAULT true NOT NULL,
	`notify_exit` integer DEFAULT true NOT NULL,
	`notify_info` integer DEFAULT true NOT NULL,
	`notify_error` integer DEFAULT true NOT NULL,
	`linked_at` text,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_links_user_id_unique` ON `telegram_links` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_links_link_code_unique` ON `telegram_links` (`link_code`);--> statement-breakpoint
CREATE TABLE `telegram_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`update_offset` integer DEFAULT 0 NOT NULL
);
