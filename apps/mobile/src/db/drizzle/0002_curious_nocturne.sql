CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 0 NOT NULL,
	`syncServerUrl` text DEFAULT '' NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT "settings_singleton" CHECK("settings"."id" = 0)
);
