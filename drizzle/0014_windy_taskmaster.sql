CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`name` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`manager_user_id` text,
	`active` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_branches_agency_name` ON `branches` (`agency_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_branches_agency_active` ON `branches` (`agency_id`,`active`);--> statement-breakpoint
ALTER TABLE `media_assets` ADD `category` text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `media_assets` ADD `thumbnail_object_key` text;--> statement-breakpoint
ALTER TABLE `media_assets` ADD `thumbnail_byte_size` integer;--> statement-breakpoint
CREATE INDEX `idx_media_property_category` ON `media_assets` (`agency_id`,`property_id`,`category`);