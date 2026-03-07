-- Add icon_url to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS icon_url VARCHAR(255);
