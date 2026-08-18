CREATE TABLE `agency_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`plan_version_id` text NOT NULL,
	`state` text DEFAULT 'trialing' NOT NULL,
	`trial_starts_at` text,
	`trial_ends_at` text,
	`current_period_starts_at` text,
	`current_period_ends_at` text,
	`grace_ends_at` text,
	`suspended_at` text,
	`canceled_at` text,
	`updated_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_version_id`) REFERENCES `plan_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subscriptions_agency` ON `agency_subscriptions` (`agency_id`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_state` ON `agency_subscriptions` (`state`,`grace_ends_at`);--> statement-breakpoint
CREATE TABLE `billing_coupons` (
	`code` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`valid_until` text,
	`max_redemptions` integer,
	`redemptions` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`subscription_id` text,
	`invoice_id` text,
	`event_type` text NOT NULL,
	`detail` text DEFAULT '{}' NOT NULL,
	`actor_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subscription_id`) REFERENCES `agency_subscriptions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `billing_invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_billing_events_agency_created` ON `billing_events` (`agency_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `billing_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`currency` text NOT NULL,
	`subtotal_minor` integer NOT NULL,
	`discount_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer NOT NULL,
	`due_at` text NOT NULL,
	`issued_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`paid_at` text,
	`payment_method` text,
	`provider_reference` text,
	`created_by` text NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subscription_id`) REFERENCES `agency_subscriptions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invoices_number` ON `billing_invoices` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `idx_invoices_agency_status` ON `billing_invoices` (`agency_id`,`status`,`due_at`);--> statement-breakpoint
CREATE TABLE `plan_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_key` text NOT NULL,
	`version` integer NOT NULL,
	`name` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`price_minor` integer DEFAULT 0 NOT NULL,
	`billing_period` text DEFAULT 'month' NOT NULL,
	`entitlements` text DEFAULT '{}' NOT NULL,
	`limits` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_plan_versions_key_version` ON `plan_versions` (`plan_key`,`version`);--> statement-breakpoint
CREATE INDEX `idx_plan_versions_status` ON `plan_versions` (`status`,`plan_key`);--> statement-breakpoint
CREATE TABLE `platform_users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_platform_users_role_active` ON `platform_users` (`role`,`active`);