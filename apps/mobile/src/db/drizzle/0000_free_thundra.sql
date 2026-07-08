CREATE TABLE `entries` (
	`habitId` text NOT NULL,
	`date` text NOT NULL,
	`outcome` text NOT NULL,
	`updatedAt` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`habitId`, `date`)
);
--> statement-breakpoint
CREATE INDEX `idx_entries_date` ON `entries` (`date`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`polarity` text NOT NULL,
	`position` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL
);
