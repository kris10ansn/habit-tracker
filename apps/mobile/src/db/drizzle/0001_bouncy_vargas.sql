ALTER TABLE `habits` ADD `createdAt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `habits` SET `createdAt` = COALESCE(
	(SELECT CAST(strftime('%s', MIN(`date`)) AS INTEGER) * 1000
	 FROM `entries`
	 WHERE `entries`.`habitId` = `habits`.`id` AND `entries`.`deleted` = 0),
	`updatedAt`
);
