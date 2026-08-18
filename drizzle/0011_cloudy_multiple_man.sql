CREATE TABLE `automation_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`event_id` text NOT NULL,
	`rule_version_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`approval_status` text DEFAULT 'not_required' NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`next_attempt_at` text,
	`last_error` text,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `domain_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rule_version_id`) REFERENCES `automation_rule_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_automation_execution_once` ON `automation_executions` (`event_id`,`rule_version_id`);--> statement-breakpoint
CREATE INDEX `idx_automation_executions_queue` ON `automation_executions` (`agency_id`,`status`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `automation_rule_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`rule_key` text NOT NULL,
	`version` integer NOT NULL,
	`name` text NOT NULL,
	`event_type` text NOT NULL,
	`conditions` text DEFAULT '{}' NOT NULL,
	`actions` text DEFAULT '[]' NOT NULL,
	`approval_required` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_automation_rule_version` ON `automation_rule_versions` (`agency_id`,`rule_key`,`version`);--> statement-breakpoint
CREATE INDEX `idx_automation_rules_event_status` ON `automation_rule_versions` (`agency_id`,`event_type`,`status`);--> statement-breakpoint
CREATE TABLE `domain_events` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`event_type` text NOT NULL,
	`aggregate_type` text NOT NULL,
	`aggregate_id` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`processed_at` text,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_domain_events_pending` ON `domain_events` (`status`,`available_at`);--> statement-breakpoint
CREATE INDEX `idx_domain_events_agency_created` ON `domain_events` (`agency_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notification_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`notification_id` text NOT NULL,
	`channel` text NOT NULL,
	`recipient` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`provider` text,
	`provider_reference` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text,
	`last_error` text,
	`sent_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notification_deliveries_queue` ON `notification_deliveries` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `idx_notification_deliveries_agency` ON `notification_deliveries` (`agency_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`recipient_user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_recipient_read` ON `notifications` (`agency_id`,`recipient_user_id`,`read_at`,`created_at`);