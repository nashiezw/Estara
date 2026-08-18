CREATE TABLE `agencies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agencies_slug` ON `agencies` (`slug`);--> statement-breakpoint
CREATE TABLE `agency_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'principal' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memberships_agency_user` ON `agency_memberships` (`agency_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_memberships_user` ON `agency_memberships` (`user_id`);--> statement-breakpoint
CREATE TABLE `enquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text,
	`contact_name` text NOT NULL,
	`initials` text NOT NULL,
	`property_label` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`source` text DEFAULT 'Website' NOT NULL,
	`response_due_at` text NOT NULL,
	`contacted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_enquiries_agency_status` ON `enquiries` (`agency_id`,`status`);--> statement-breakpoint
CREATE TABLE `next_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`action_type` text NOT NULL,
	`reason` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`due_at` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`assigned_user_id` text NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_next_actions_agency_status_due` ON `next_actions` (`agency_id`,`status`,`due_at`);--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`reference` text NOT NULL,
	`title` text NOT NULL,
	`location` text NOT NULL,
	`price_minor` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`price_label` text NOT NULL,
	`bedrooms` integer DEFAULT 0 NOT NULL,
	`bathrooms` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`photo_count` integer DEFAULT 0 NOT NULL,
	`owner_phone` text DEFAULT '' NOT NULL,
	`land_size` text DEFAULT '' NOT NULL,
	`completeness` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_properties_agency_reference` ON `properties` (`agency_id`,`reference`);--> statement-breakpoint
CREATE INDEX `idx_properties_agency_status` ON `properties` (`agency_id`,`status`);