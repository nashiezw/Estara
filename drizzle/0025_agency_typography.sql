ALTER TABLE agency_settings ADD COLUMN typography TEXT NOT NULL DEFAULT 'classic';

PRAGMA optimize;
