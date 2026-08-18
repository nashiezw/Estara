CREATE TABLE `team_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`invited_by` text NOT NULL,
	`accepted_by` text,
	`accepted_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_team_invitations_token_hash` ON `team_invitations` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_team_invitations_agency_email` ON `team_invitations` (`agency_id`,`email`);