CREATE TABLE `contact_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`activity_type` text NOT NULL,
	`summary` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_contact_activities_contact_created` ON `contact_activities` (`agency_id`,`contact_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`full_name` text NOT NULL,
	`phone_e164` text,
	`email_normalized` text,
	`roles` text DEFAULT '[]' NOT NULL,
	`requirements` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`assigned_user_id` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_contacts_agency_phone` ON `contacts` (`agency_id`,`phone_e164`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_contacts_agency_email` ON `contacts` (`agency_id`,`email_normalized`);--> statement-breakpoint
CREATE INDEX `idx_contacts_agency_name` ON `contacts` (`agency_id`,`full_name`);--> statement-breakpoint
ALTER TABLE `agency_settings` ADD `response_sla_minutes` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `enquiries` ADD `contact_id` text;--> statement-breakpoint
ALTER TABLE `enquiries` ADD `assigned_user_id` text;--> statement-breakpoint
ALTER TABLE `enquiries` ADD `stage` text DEFAULT 'New' NOT NULL;--> statement-breakpoint
ALTER TABLE `enquiries` ADD `next_follow_up_at` text;