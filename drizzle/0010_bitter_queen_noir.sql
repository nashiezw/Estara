CREATE TABLE `mandates` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text NOT NULL,
	`owner_contact_id` text,
	`type` text NOT NULL,
	`starts_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`commission_basis_points` integer DEFAULT 0 NOT NULL,
	`terms` text DEFAULT '' NOT NULL,
	`document_media_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_mandates_agency_expiry` ON `mandates` (`agency_id`,`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_mandates_property` ON `mandates` (`agency_id`,`property_id`);--> statement-breakpoint
CREATE TABLE `property_activation_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text NOT NULL,
	`channel` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`activated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deactivated_at` text,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_property_activation_channel` ON `property_activation_channels` (`agency_id`,`property_id`,`channel`);--> statement-breakpoint
CREATE TABLE `property_feature_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_property_features_agency_name` ON `property_feature_definitions` (`agency_id`,`name`);--> statement-breakpoint
CREATE TABLE `property_status_events` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text NOT NULL,
	`from_status` text NOT NULL,
	`to_status` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`actor_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_property_status_events_property` ON `property_status_events` (`agency_id`,`property_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `property_verification_items` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text NOT NULL,
	`item_key` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`verified_by` text,
	`verified_at` text,
	`note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_property_verification_item` ON `property_verification_items` (`agency_id`,`property_id`,`item_key`);--> statement-breakpoint
ALTER TABLE `properties` ADD `property_type` text DEFAULT 'House' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `toilets` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `parking` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `garages` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `owner_contact_id` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `listing_agent_id` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `branch_id` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `mandate_id` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `building_size` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `country` text DEFAULT 'Zimbabwe' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `province` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `suburb` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `address` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `latitude` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `longitude` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `features` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_properties_agency_agent` ON `properties` (`agency_id`,`listing_agent_id`);