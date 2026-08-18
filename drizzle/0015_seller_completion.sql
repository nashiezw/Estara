ALTER TABLE `documents` ADD `seller_visible` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `documents` ADD `approved_by` text;
--> statement-breakpoint
ALTER TABLE `documents` ADD `approved_at` text;
--> statement-breakpoint
ALTER TABLE `seller_reports` ADD `offers` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `seller_reports` ADD `momentum` text DEFAULT 'Early activity' NOT NULL;
--> statement-breakpoint
ALTER TABLE `seller_reports` ADD `pdf_object_key` text;
--> statement-breakpoint
ALTER TABLE `seller_reports` ADD `pdf_byte_size` integer;
--> statement-breakpoint
CREATE TABLE `offers` (`id` text PRIMARY KEY NOT NULL,`agency_id` text NOT NULL,`property_id` text NOT NULL,`contact_id` text,`amount_minor` integer NOT NULL,`currency` text DEFAULT 'USD' NOT NULL,`status` text DEFAULT 'submitted' NOT NULL,`conditions` text DEFAULT '' NOT NULL,`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`created_by` text NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`),FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`),FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_offers_agency_property` ON `offers` (`agency_id`,`property_id`,`submitted_at`);
--> statement-breakpoint
CREATE INDEX `idx_offers_agency_status` ON `offers` (`agency_id`,`status`);
--> statement-breakpoint
CREATE TABLE `seller_report_schedules` (`id` text PRIMARY KEY NOT NULL,`agency_id` text NOT NULL,`property_id` text NOT NULL,`frequency` text NOT NULL,`recipient_email` text NOT NULL,`next_run_at` text NOT NULL,`active` integer DEFAULT true NOT NULL,`created_by` text NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`),FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_seller_schedules_due` ON `seller_report_schedules` (`agency_id`,`active`,`next_run_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_seller_schedule_property_email` ON `seller_report_schedules` (`agency_id`,`property_id`,`recipient_email`);
--> statement-breakpoint
CREATE TABLE `seller_deliveries` (`id` text PRIMARY KEY NOT NULL,`agency_id` text NOT NULL,`property_id` text NOT NULL,`report_id` text,`document_id` text,`recipient_email` text NOT NULL,`channel` text NOT NULL,`status` text DEFAULT 'queued' NOT NULL,`provider` text,`provider_reference` text,`attempts` integer DEFAULT 0 NOT NULL,`last_error` text,`sent_at` text,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`),FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`),FOREIGN KEY (`report_id`) REFERENCES `seller_reports`(`id`),FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_seller_deliveries_agency` ON `seller_deliveries` (`agency_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_seller_deliveries_report` ON `seller_deliveries` (`report_id`,`channel`);
