-- Add is_primary field to invitees table
ALTER TABLE public.invitees
ADD COLUMN is_primary boolean DEFAULT false;
