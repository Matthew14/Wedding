-- Migration: Secure RLS Policies
-- Replaces overly permissive "Allow all for anon" policies with proper security
--
-- ============================================================================
-- SECURITY MODEL
-- ============================================================================
--
-- This migration implements defense-in-depth security. RLS policies serve as
-- a backstop to API-level validation, not a replacement.
--
-- IMPORTANT ASSUMPTIONS:
-- 1. The Supabase anon key is NEVER exposed to clients directly
-- 2. All database mutations go through API endpoints that validate RSVP codes
-- 3. The anon key is only used server-side in API routes
--
-- TABLE PERMISSIONS:
-- +------------+--------+--------+--------+--------+---------------------------+
-- | Table      | SELECT | INSERT | UPDATE | DELETE | Notes                     |
-- +------------+--------+--------+--------+--------+---------------------------+
-- | invitation | public |   -    |   -    |   -    | Read-only for public      |
-- | RSVPs      | public |   -    | public |   -    | API validates code        |
-- | invitees   | public |   -    | public |   -    | API validates code        |
-- | FAQs       | public |  auth  |  auth  |  auth  | Public read, admin write  |
-- +------------+--------+--------+--------+--------+---------------------------+
--
-- Legend: public = public role, auth = authenticated role, - = not permitted
--

-- ============================================================================
-- DROP EXISTING PERMISSIVE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Allow all for anon" ON public.invitation;
DROP POLICY IF EXISTS "Allow all for anon" ON public."RSVPs";
DROP POLICY IF EXISTS "Allow all for anon" ON public.invitees;
DROP POLICY IF EXISTS "Allow all for anon" ON public."FAQs";

-- Also drop any policies from previous runs of this migration
DROP POLICY IF EXISTS "Allow public select" ON public.invitation;
DROP POLICY IF EXISTS "Allow authenticated all" ON public.invitation;
DROP POLICY IF EXISTS "Allow public select" ON public."RSVPs";
DROP POLICY IF EXISTS "Allow public update" ON public."RSVPs";
DROP POLICY IF EXISTS "Allow authenticated all" ON public."RSVPs";
DROP POLICY IF EXISTS "Allow public select" ON public.invitees;
DROP POLICY IF EXISTS "Allow public update" ON public.invitees;
DROP POLICY IF EXISTS "Allow authenticated all" ON public.invitees;
DROP POLICY IF EXISTS "Allow anon select" ON public."FAQs";
DROP POLICY IF EXISTS "Allow public select" ON public."FAQs";
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."FAQs";
DROP POLICY IF EXISTS "Allow authenticated update" ON public."FAQs";
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."FAQs";

-- ============================================================================
-- INVITATION TABLE POLICIES
-- ============================================================================
-- Public: SELECT only (needed for API to fetch invitation data)
-- Public: NO INSERT, UPDATE, DELETE (invitations are admin-managed)

CREATE POLICY "invitation_public_select" ON public.invitation
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "invitation_authenticated_all" ON public.invitation
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- RSVPs TABLE POLICIES
-- ============================================================================
-- Public: SELECT, UPDATE (API validates access via short_url code)
-- Public: NO INSERT, DELETE (RSVPs are created by admin, guests can only update)

CREATE POLICY "rsvps_public_select" ON public."RSVPs"
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "rsvps_public_update" ON public."RSVPs"
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "rsvps_authenticated_all" ON public."RSVPs"
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- INVITEES TABLE POLICIES
-- ============================================================================
-- Public: SELECT, UPDATE (API validates access via RSVP code)
-- Public: NO INSERT, DELETE (invitees are created by admin, guests can only update attendance)

CREATE POLICY "invitees_public_select" ON public.invitees
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "invitees_public_update" ON public.invitees
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "invitees_authenticated_all" ON public.invitees
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- FAQs TABLE POLICIES
-- ============================================================================
-- Public: SELECT only (FAQs are public information)
-- Public: NO INSERT, UPDATE, DELETE (FAQs are admin-managed)

CREATE POLICY "faqs_public_select" ON public."FAQs"
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "faqs_authenticated_insert" ON public."FAQs"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "faqs_authenticated_update" ON public."FAQs"
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "faqs_authenticated_delete" ON public."FAQs"
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- POLICY COMMENTS
-- ============================================================================

-- Invitation table
COMMENT ON POLICY "invitation_public_select" ON public.invitation IS
    'Public users can read invitations. API validates access via RSVP code.';
COMMENT ON POLICY "invitation_authenticated_all" ON public.invitation IS
    'Authenticated users (admin dashboard) have full access to manage invitations.';

-- RSVPs table
COMMENT ON POLICY "rsvps_public_select" ON public."RSVPs" IS
    'Public users can read RSVPs. API validates access via short_url code.';
COMMENT ON POLICY "rsvps_public_update" ON public."RSVPs" IS
    'Public users can update RSVPs. API validates code before allowing update.';
COMMENT ON POLICY "rsvps_authenticated_all" ON public."RSVPs" IS
    'Authenticated users (admin dashboard) have full access to manage RSVPs.';

-- Invitees table
COMMENT ON POLICY "invitees_public_select" ON public.invitees IS
    'Public users can read invitees. API validates access via RSVP code.';
COMMENT ON POLICY "invitees_public_update" ON public.invitees IS
    'Public users can update invitee attendance. API validates via RSVP code.';
COMMENT ON POLICY "invitees_authenticated_all" ON public.invitees IS
    'Authenticated users (admin dashboard) have full access to manage invitees.';

-- FAQs table
COMMENT ON POLICY "faqs_public_select" ON public."FAQs" IS
    'FAQs are public information, anyone can read them.';
COMMENT ON POLICY "faqs_authenticated_insert" ON public."FAQs" IS
    'Only authenticated users (admin) can create new FAQs.';
COMMENT ON POLICY "faqs_authenticated_update" ON public."FAQs" IS
    'Only authenticated users (admin) can update FAQs.';
COMMENT ON POLICY "faqs_authenticated_delete" ON public."FAQs" IS
    'Only authenticated users (admin) can delete FAQs.';
