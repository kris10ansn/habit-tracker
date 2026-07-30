UPDATE `habits` SET `polarity` = 'Positive' WHERE `polarity` = 'positive';--> statement-breakpoint
UPDATE `habits` SET `polarity` = 'Negative' WHERE `polarity` = 'negative';--> statement-breakpoint
UPDATE `entries` SET `outcome` = 'Success' WHERE `outcome` = 'success';--> statement-breakpoint
UPDATE `entries` SET `outcome` = 'Failure' WHERE `outcome` = 'failure';
