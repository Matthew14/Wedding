-- Add villa_offered field to invitation table
-- Indicates whether the guest is being offered a room at the villa
ALTER TABLE public.invitation
ADD COLUMN villa_offered boolean DEFAULT true NOT NULL;
