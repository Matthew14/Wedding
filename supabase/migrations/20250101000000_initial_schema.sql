-- Initial schema migration for Wedding project
-- Creates tables: invitation, RSVPs, invitees, FAQs
-- Enables RLS with permissive policies for testing

-- Invitation table
CREATE TABLE IF NOT EXISTS public.invitation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "isMatthewSide" BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVPs table
CREATE TABLE IF NOT EXISTS public."RSVPs" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES public.invitation(id) ON DELETE CASCADE,
    short_url VARCHAR(6) NOT NULL UNIQUE,
    accepted BOOLEAN,
    staying_villa BOOLEAN,
    dietary_restrictions TEXT,
    song_request TEXT,
    travel_plans TEXT,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitees table
CREATE TABLE IF NOT EXISTS public.invitees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES public.invitation(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    coming BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAQs table
CREATE TABLE IF NOT EXISTS public."FAQs" (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.invitation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RSVPs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FAQs" ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for anon key (used in tests)
-- In production, these should be more restrictive

CREATE POLICY "Allow all for anon" ON public.invitation
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public."RSVPs"
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public.invitees
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public."FAQs"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rsvps_short_url ON public."RSVPs"(short_url);
CREATE INDEX IF NOT EXISTS idx_rsvps_invitation_id ON public."RSVPs"(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitees_invitation_id ON public.invitees(invitation_id);
CREATE INDEX IF NOT EXISTS idx_faqs_created_at ON public."FAQs"(created_at);
