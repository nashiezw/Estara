CREATE TABLE `marketing_copy_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text NOT NULL,
	`version` integer NOT NULL,
	`headline` text NOT NULL,
	`listing_description` text NOT NULL,
	`social_caption` text NOT NULL,
	`facts_snapshot` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_marketing_copy_version` ON `marketing_copy_versions` (`agency_id`,`property_id`,`version`);--> statement-breakpoint
CREATE INDEX `idx_marketing_copy_status` ON `marketing_copy_versions` (`agency_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `marketing_outputs` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`job_id` text NOT NULL,
	`kind` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `marketing_render_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_marketing_output_job_kind` ON `marketing_outputs` (`job_id`,`kind`);--> statement-breakpoint
CREATE INDEX `idx_marketing_outputs_agency` ON `marketing_outputs` (`agency_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `marketing_render_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text NOT NULL,
	`template_version_id` text NOT NULL,
	`format` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`input_snapshot` text NOT NULL,
	`review_status` text DEFAULT 'draft' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`last_error` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_version_id`) REFERENCES `marketing_template_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_marketing_jobs_agency_status` ON `marketing_render_jobs` (`agency_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_marketing_jobs_property` ON `marketing_render_jobs` (`agency_id`,`property_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `marketing_template_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`template_key` text NOT NULL,
	`version` integer NOT NULL,
	`name` text NOT NULL,
	`format` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`configuration` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_marketing_template_version` ON `marketing_template_versions` (`agency_id`,`template_key`,`version`);--> statement-breakpoint
CREATE INDEX `idx_marketing_templates_format` ON `marketing_template_versions` (`agency_id`,`format`,`status`);