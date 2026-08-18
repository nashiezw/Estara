CREATE TABLE `agency_settings` (
	`agency_id` text PRIMARY KEY NOT NULL,
	`tagline` text DEFAULT '' NOT NULL,
	`primary_color` text DEFAULT '#153b34' NOT NULL,
	`accent_color` text DEFAULT '#e6bd5f' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`whatsapp` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`business_activities` text DEFAULT '[]' NOT NULL,
	`website_template` text DEFAULT 'classic' NOT NULL,
	`onboarding_complete` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`detail` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_agency_created` ON `audit_logs` (`agency_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`platform_name` text NOT NULL,
	`short_name` text NOT NULL,
	`parent_brand` text DEFAULT '' NOT NULL,
	`tagline` text DEFAULT '' NOT NULL,
	`primary_color` text DEFAULT '#153b34' NOT NULL,
	`support_email` text DEFAULT '' NOT NULL,
	`support_phone` text DEFAULT '' NOT NULL,
	`support_whatsapp` text DEFAULT '' NOT NULL,
	`default_country` text DEFAULT 'ZW' NOT NULL,
	`default_currency` text DEFAULT 'USD' NOT NULL,
	`timezone` text DEFAULT 'Africa/Harare' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` text NOT NULL,
	`permission` text NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_role_permissions_role_permission` ON `role_permissions` (`role_id`,`permission`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`name` text NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_roles_agency_name` ON `roles` (`agency_id`,`name`);