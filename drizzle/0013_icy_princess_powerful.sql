CREATE TABLE `document_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`document_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_by` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_document_tokens_hash` ON `document_access_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_document_tokens_expiry` ON `document_access_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`resource_type` text DEFAULT 'agency' NOT NULL,
	`resource_id` text,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`object_key` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_documents_object_key` ON `documents` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_documents_agency_created` ON `documents` (`agency_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_documents_resource` ON `documents` (`agency_id`,`resource_type`,`resource_id`);