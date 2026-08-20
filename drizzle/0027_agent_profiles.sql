CREATE TABLE `agent_profiles` (
  `agency_id` text NOT NULL,
  `user_id` text NOT NULL,
  `display_name` text DEFAULT '' NOT NULL,
  `title` text DEFAULT '' NOT NULL,
  `phone` text DEFAULT '' NOT NULL,
  `whatsapp` text DEFAULT '' NOT NULL,
  `experience` text DEFAULT '' NOT NULL,
  `bio` text DEFAULT '' NOT NULL,
  `areas` text DEFAULT '' NOT NULL,
  `languages` text DEFAULT '' NOT NULL,
  `profile_photo_media_id` text,
  `public_enabled` integer DEFAULT 1 NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agent_profiles_member` ON `agent_profiles` (`agency_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_agent_profiles_public` ON `agent_profiles` (`agency_id`,`public_enabled`);
