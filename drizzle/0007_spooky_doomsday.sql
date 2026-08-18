CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text,
	`kind` text NOT NULL,
	`object_key` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_object_key` ON `media_assets` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_media_agency_property` ON `media_assets` (`agency_id`,`property_id`,`sort_order`);