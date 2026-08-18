CREATE TABLE `viewings` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text NOT NULL,
	`enquiry_id` text,
	`contact_id` text,
	`assigned_user_id` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`status` text DEFAULT 'Requested' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`interest_level` text,
	`reminder_at` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_viewings_agency_start` ON `viewings` (`agency_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `idx_viewings_agent_start` ON `viewings` (`agency_id`,`assigned_user_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `idx_viewings_property_start` ON `viewings` (`agency_id`,`property_id`,`starts_at`);