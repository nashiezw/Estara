CREATE TABLE `property_requirements` (`id` text PRIMARY KEY NOT NULL,`agency_id` text NOT NULL,`contact_id` text NOT NULL,`enquiry_id` text,`transaction_type` text NOT NULL,`property_types` text DEFAULT '[]' NOT NULL,`locations` text DEFAULT '[]' NOT NULL,`min_price_minor` integer,`max_price_minor` integer,`min_bedrooms` integer DEFAULT 0 NOT NULL,`min_bathrooms` integer DEFAULT 0 NOT NULL,`features` text DEFAULT '[]' NOT NULL,`notes` text DEFAULT '' NOT NULL,`status` text DEFAULT 'active' NOT NULL,`created_by` text NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`),FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`),FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_requirements_agency_status` ON `property_requirements` (`agency_id`,`status`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_requirements_contact` ON `property_requirements` (`agency_id`,`contact_id`);
--> statement-breakpoint
CREATE TABLE `property_matches` (`id` text PRIMARY KEY NOT NULL,`agency_id` text NOT NULL,`requirement_id` text NOT NULL,`property_id` text NOT NULL,`score` integer NOT NULL,`explanation` text DEFAULT '[]' NOT NULL,`status` text DEFAULT 'suggested' NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`),FOREIGN KEY (`requirement_id`) REFERENCES `property_requirements`(`id`),FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_matches_requirement_property` ON `property_matches` (`requirement_id`,`property_id`);
--> statement-breakpoint
CREATE INDEX `idx_matches_agency_status` ON `property_matches` (`agency_id`,`status`,`score`);
--> statement-breakpoint
CREATE TABLE `shortlists` (`id` text PRIMARY KEY NOT NULL,`agency_id` text NOT NULL,`contact_id` text NOT NULL,`title` text NOT NULL,`status` text DEFAULT 'draft' NOT NULL,`token_hash` text,`published_at` text,`expires_at` text,`created_by` text NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`),FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_shortlists_agency_contact` ON `shortlists` (`agency_id`,`contact_id`,`created_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shortlists_token` ON `shortlists` (`token_hash`);
--> statement-breakpoint
CREATE TABLE `shortlist_items` (`id` text PRIMARY KEY NOT NULL,`agency_id` text NOT NULL,`shortlist_id` text NOT NULL,`property_id` text NOT NULL,`match_id` text,`sort_order` integer DEFAULT 0 NOT NULL,`note` text DEFAULT '' NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`),FOREIGN KEY (`shortlist_id`) REFERENCES `shortlists`(`id`),FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`),FOREIGN KEY (`match_id`) REFERENCES `property_matches`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shortlist_item_property` ON `shortlist_items` (`shortlist_id`,`property_id`);
--> statement-breakpoint
CREATE INDEX `idx_shortlist_items_agency` ON `shortlist_items` (`agency_id`,`shortlist_id`,`sort_order`);
