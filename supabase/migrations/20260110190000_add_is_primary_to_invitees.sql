-- Add is_primary column to invitees table
-- This column indicates the primary invitee (usually the first person added to an invitation)
-- Used for ordering invitees in API responses and metadata generation

ALTER TABLE public.invitees ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_invitees_is_primary ON public.invitees(is_primary);

COMMENT ON COLUMN public.invitees.is_primary IS 'Indicates the primary invitee for display ordering purposes';
