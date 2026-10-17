CREATE TABLE `portfolio_positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`symbol` text NOT NULL,
	`exchange` text DEFAULT 'BINANCE' NOT NULL,
	`quantity` real NOT NULL,
	`buy_price` real NOT NULL,
	`buy_date` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
