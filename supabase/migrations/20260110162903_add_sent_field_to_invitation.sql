-- Add sent column to invitation table
ALTER TABLE invitation ADD COLUMN IF NOT EXISTS sent BOOLEAN DEFAULT FALSE;
