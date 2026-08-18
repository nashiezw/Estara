CREATE TABLE `seller_access_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text NOT NULL,
	`contact_id` text,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_user_id` text,
	`accepted_at` text,
	`revoked_at` text,
	`invited_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_seller_grants_token` ON `seller_access_grants` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_seller_grants_agency_property` ON `seller_access_grants` (`agency_id`,`property_id`);--> statement-breakpoint
CREATE INDEX `idx_seller_grants_user` ON `seller_access_grants` (`accepted_user_id`,`revoked_at`);--> statement-breakpoint
CREATE TABLE `seller_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`enquiries` integer DEFAULT 0 NOT NULL,
	`viewings` integer DEFAULT 0 NOT NULL,
	`summary` text NOT NULL,
	`recommended_action` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_seller_reports_agency_property` ON `seller_reports` (`agency_id`,`property_id`,`period_end`);--> statement-breakpoint
CREATE INDEX `idx_seller_reports_property_status` ON `seller_reports` (`property_id`,`status`,`period_end`);