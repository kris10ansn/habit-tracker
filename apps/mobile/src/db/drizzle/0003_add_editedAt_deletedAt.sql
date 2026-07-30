CREATE TABLE `__new_habits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`polarity` text NOT NULL,
	`position` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`editedAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer
);
--> statement-breakpoint
INSERT INTO `__new_habits`(`id`, `name`, `polarity`, `position`, `createdAt`, `editedAt`, `updatedAt`, `deletedAt`) SELECT `id`, `name`, `polarity`, `position`, `createdAt`, `updatedAt`, `updatedAt`, CASE WHEN `deleted` = 0 THEN NULL ELSE `updatedAt` END FROM `habits`;--> statement-breakpoint
DROP TABLE `habits`;--> statement-breakpoint
ALTER TABLE `__new_habits` RENAME TO `habits`;--> statement-breakpoint
CREATE TABLE `__new_entries` (
	`habitId` text NOT NULL,
	`date` text NOT NULL,
	`outcome` text NOT NULL,
	`editedAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	PRIMARY KEY(`habitId`, `date`)
);
--> statement-breakpoint
INSERT INTO `__new_entries`(`habitId`, `date`, `outcome`, `editedAt`, `updatedAt`, `deletedAt`) SELECT `habitId`, `date`, `outcome`, `updatedAt`, `updatedAt`, CASE WHEN `deleted` = 0 THEN NULL ELSE `updatedAt` END FROM `entries`;--> statement-breakpoint
DROP TABLE `entries`;--> statement-breakpoint
ALTER TABLE `__new_entries` RENAME TO `entries`;--> statement-breakpoint
CREATE INDEX `idx_entries_date` ON `entries` (`date`);
