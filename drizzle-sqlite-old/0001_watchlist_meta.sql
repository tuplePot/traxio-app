ALTER TABLE `watchlist` ADD `exchange` text NOT NULL DEFAULT 'BINANCE';
--> statement-breakpoint
ALTER TABLE `watchlist` ADD `description` text;
--> statement-breakpoint
ALTER TABLE `watchlist` ADD `symbol_type` text;
