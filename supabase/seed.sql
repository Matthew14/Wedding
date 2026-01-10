-- Seed data for testing Wedding project
-- Test invitation, RSVP, and invitees data

-- Seed test admin user for authentication
-- Password: password123
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'admin@wedding.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Create identity for the user (required for login)
INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"admin@wedding.test"}',
    'email',
    NOW(),
    NOW(),
    NOW()
);

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
INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'John', 'Doe', NULL, TRUE),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Jane', 'Doe', NULL, FALSE);

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

INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
    ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'Alice', 'Smith', NULL, TRUE);

-- Third test invitation with 3 invitees
INSERT INTO public.invitation (id, "isMatthewSide") VALUES
    ('88888888-8888-8888-8888-888888888888', true);

INSERT INTO public."RSVPs" (
    id,
    invitation_id,
    short_url,
    accepted,
    staying_villa
) VALUES (
    '99999999-9999-9999-9999-999999999999',
    '88888888-8888-8888-8888-888888888888',
    'TEST03',
    NULL,
    NULL
);

INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
    ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '88888888-8888-8888-8888-888888888888', 'Michael', 'Johnson', NULL, TRUE),
    ('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '88888888-8888-8888-8888-888888888888', 'Sarah', 'Johnson', NULL, FALSE),
    ('cccccccc-dddd-eeee-ffff-111111111111', '88888888-8888-8888-8888-888888888888', 'Emma', 'Johnson', NULL, FALSE);

-- Fourth test invitation with 4 invitees (family)
INSERT INTO public.invitation (id, "isMatthewSide") VALUES
    ('dddddddd-eeee-ffff-1111-222222222222', false);

INSERT INTO public."RSVPs" (
    id,
    invitation_id,
    short_url,
    accepted,
    staying_villa
) VALUES (
    'eeeeeeee-ffff-1111-2222-333333333333',
    'dddddddd-eeee-ffff-1111-222222222222',
    'TEST04',
    NULL,
    NULL
);

INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
    ('ffffffff-1111-2222-3333-444444444444', 'dddddddd-eeee-ffff-1111-222222222222', 'James', 'Williams', NULL, TRUE),
    ('11111111-2222-3333-4444-555555555555', 'dddddddd-eeee-ffff-1111-222222222222', 'Sarah', 'Williams', NULL, FALSE),
    ('22222222-3333-4444-5555-666666666666', 'dddddddd-eeee-ffff-1111-222222222222', 'Tom', 'Williams', NULL, FALSE),
    ('33333333-4444-5555-6666-777777777777', 'dddddddd-eeee-ffff-1111-222222222222', 'Lucy', 'Williams', NULL, FALSE);

-- Fifth test invitation with mixed surnames (2 from one family + 1 from another)
-- Expected display: "David, Michael & Emily" (David is primary)
INSERT INTO public.invitation (id, "isMatthewSide") VALUES
    ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

INSERT INTO public."RSVPs" (
    id,
    invitation_id,
    short_url,
    accepted,
    staying_villa
) VALUES (
    '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'TEST05',
    NULL,
    NULL
);

-- David Wilson is the primary guest (our friend), with his partner's family
INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
    ('33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Michael', 'Carter', NULL, FALSE),
    ('44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Emily', 'Carter', NULL, FALSE),
    ('55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'David', 'Wilson', NULL, TRUE);

-- Sixth test invitation with villa_offered = false (no room offered)
INSERT INTO public.invitation (id, "isMatthewSide", villa_offered) VALUES
    ('66666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false, false);

INSERT INTO public."RSVPs" (
    id,
    invitation_id,
    short_url,
    accepted,
    staying_villa
) VALUES (
    '77777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '66666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'TEST06',
    NULL,
    NULL
);

INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
    ('88888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Robert', 'Green', NULL, TRUE);
