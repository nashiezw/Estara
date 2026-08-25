ALTER TABLE branches ADD COLUMN email TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE branches ADD COLUMN whatsapp TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE branches ADD COLUMN address TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE branches ADD COLUMN description TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE branches ADD COLUMN opening_hours TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE branches ADD COLUMN public_enabled INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE branches ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
