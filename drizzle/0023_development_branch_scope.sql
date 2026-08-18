ALTER TABLE developments ADD COLUMN branch_id TEXT REFERENCES branches(id);
CREATE INDEX idx_developments_branch ON developments(agency_id,branch_id);
PRAGMA optimize;
