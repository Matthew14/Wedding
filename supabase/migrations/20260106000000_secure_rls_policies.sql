-- Migration: Secure RLS Policies
-- Replaces overly permissive "Allow all for anon" policies with proper security
--
-- Security Model:
-- - RSVPs: anon can SELECT/UPDATE (API validates code), no INSERT/DELETE
-- - Invitees: anon can SELECT/UPDATE (API validates via invitation), no INSERT/DELETE
-- - Invitation: anon can SELECT only
-- - FAQs: anon can SELECT, authenticated users can INSERT/UPDATE/DELETE

-- ============================================================================
-- DROP EXISTING PERMISSIVE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Allow all for anon" ON public.invitation;
DROP POLICY IF EXISTS "Allow all for anon" ON public."RSVPs";
DROP POLICY IF EXISTS "Allow all for anon" ON public.invitees;
DROP POLICY IF EXISTS "Allow all for anon" ON public."FAQs";

-- ============================================================================
-- INVITATION TABLE POLICIES
-- ============================================================================

-- Public users can only read invitations (needed for API to fetch invitation data)
CREATE POLICY "Allow public select" ON public.invitation
    FOR SELECT
    TO public
    USING (true);

-- Authenticated users can do everything (admin dashboard)
CREATE POLICY "Allow authenticated all" ON public.invitation
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- RSVPs TABLE POLICIES
-- ============================================================================

-- Public users can read RSVPs (API validates access via short_url code)
CREATE POLICY "Allow public select" ON public."RSVPs"
    FOR SELECT
    TO public
    USING (true);

-- Public users can update RSVPs (API validates code before allowing update)
CREATE POLICY "Allow public update" ON public."RSVPs"
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Authenticated users can do everything (admin dashboard)
CREATE POLICY "Allow authenticated all" ON public."RSVPs"
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- INVITEES TABLE POLICIES
-- ============================================================================

-- Public users can read invitees (API validates access via RSVP code)
CREATE POLICY "Allow public select" ON public.invitees
    FOR SELECT
    TO public
    USING (true);

-- Public users can update invitee attendance (API validates via RSVP code)
CREATE POLICY "Allow public update" ON public.invitees
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Authenticated users can do everything (admin dashboard)
CREATE POLICY "Allow authenticated all" ON public.invitees
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- FAQs TABLE POLICIES
-- ============================================================================

-- Anyone can read FAQs (public information)
CREATE POLICY "Allow public select" ON public."FAQs"
    FOR SELECT
    TO public
    USING (true);

-- Only authenticated users can create FAQs
CREATE POLICY "Allow authenticated insert" ON public."FAQs"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Only authenticated users can update FAQs
CREATE POLICY "Allow authenticated update" ON public."FAQs"
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Only authenticated users can delete FAQs
CREATE POLICY "Allow authenticated delete" ON public."FAQs"
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Allow public select" ON public.invitation IS
    'Public users can read invitations. API validates access via RSVP code.';

COMMENT ON POLICY "Allow public select" ON public."RSVPs" IS
    'Public users can read RSVPs. API validates access via short_url code.';

COMMENT ON POLICY "Allow public update" ON public."RSVPs" IS
    'Public users can update RSVPs. API validates code before allowing update.';

COMMENT ON POLICY "Allow public select" ON public.invitees IS
    'Public users can read invitees. API validates access via RSVP code.';

COMMENT ON POLICY "Allow public update" ON public.invitees IS
    'Public users can update invitee attendance. API validates via RSVP code.';

COMMENT ON POLICY "Allow public select" ON public."FAQs" IS
    'FAQs are public information, anyone can read them.';
