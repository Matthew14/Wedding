-- Seed data for testing Wedding project
-- Test invitation, RSVP, and invitees data

-- Insert test invitation
INSERT INTO public.invitation (id, "isMatthewSide") VALUES
    ('11111111-1111-1111-1111-111111111111', true);

-- Insert test RSVP with code TEST01
INSERT INTO public."RSVPs" (
    id,
    invitation_id,
    short_url,
    accepted,
    staying_villa,
    dietary_restrictions,
    song_request,
    travel_plans,
    message
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'TEST01',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
);

-- Insert test invitees for the test invitation
INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming) VALUES
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'John', 'Doe', NULL),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Jane', 'Doe', NULL);

-- Insert test FAQ
INSERT INTO public."FAQs" (id, question, answer) VALUES
    ('test-faq-1', 'What time is the ceremony?', 'The ceremony starts at 4pm.');

-- Insert second test RSVP with different code for additional testing
INSERT INTO public.invitation (id, "isMatthewSide") VALUES
    ('55555555-5555-5555-5555-555555555555', false);

INSERT INTO public."RSVPs" (
    id,
    invitation_id,
    short_url,
    accepted,
    staying_villa
) VALUES (
    '66666666-6666-6666-6666-666666666666',
    '55555555-5555-5555-5555-555555555555',
    'TEST02',
    NULL,
    NULL
);

INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming) VALUES
    ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'Alice', 'Smith', NULL);
