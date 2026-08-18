CREATE TABLE `public_events` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text,
	`event_type` text NOT NULL,
	`session_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_public_events_agency_type_created` ON `public_events` (`agency_id`,`event_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `public_intake_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_public_intake_agency_fingerprint_created` ON `public_intake_attempts` (`agency_id`,`fingerprint`,`created_at`);