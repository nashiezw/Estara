CREATE TABLE `deal_stages` (`id` text PRIMARY KEY NOT NULL,`agency_id` text NOT NULL,`name` text NOT NULL,`position` integer NOT NULL,`probability` integer DEFAULT 0 NOT NULL,`outcome` text DEFAULT 'open' NOT NULL,`active` integer DEFAULT true NOT NULL,`created_by` text NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_deal_stages_agency_position` ON `deal_stages` (`agency_id`,`position`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_deal_stages_agency_name` ON `deal_stages` (`agency_id`,`name`);
--> statement-breakpoint
CREATE TABLE `deals` (`id` text PRIMARY KEY NOT NULL,`agency_id` text NOT NULL,`property_id` text NOT NULL,`contact_id` text NOT NULL,`enquiry_id` text,`offer_id` text,`stage_id` text NOT NULL,`title` text NOT NULL,`value_minor` integer NOT NULL,`currency` text DEFAULT 'USD' NOT NULL,`commission_basis_points` integer DEFAULT 0 NOT NULL,`expected_close_at` text,`status` text DEFAULT 'open' NOT NULL,`lost_reason` text,`created_by` text NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`),FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`),FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`),FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries`(`id`),FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`),FOREIGN KEY (`stage_id`) REFERENCES `deal_stages`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_deals_agency_stage` ON `deals` (`agency_id`,`stage_id`,`status`);
--> statement-breakpoint
CREATE INDEX `idx_deals_property` ON `deals` (`agency_id`,`property_id`);
--> statement-breakpoint
CREATE TABLE `deal_stage_events` (`id` text PRIMARY KEY NOT NULL,`agency_id` text NOT NULL,`deal_id` text NOT NULL,`from_stage_id` text,`to_stage_id` text NOT NULL,`actor_user_id` text NOT NULL,`note` text DEFAULT '' NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`),FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`),FOREIGN KEY (`to_stage_id`) REFERENCES `deal_stages`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_deal_events_deal` ON `deal_stage_events` (`agency_id`,`deal_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `deal_commission_splits` (`id` text PRIMARY KEY NOT NULL,`agency_id` text NOT NULL,`deal_id` text NOT NULL,`user_id` text NOT NULL,`basis_points` integer NOT NULL,`amount_minor` integer NOT NULL,`finalized_at` text,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`),FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_deal_split_user` ON `deal_commission_splits` (`deal_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_deal_splits_agency` ON `deal_commission_splits` (`agency_id`,`created_at`);
