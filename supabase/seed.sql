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
    (1, true);

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
    1,
    1,
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
    (1, 1, 'John', 'Doe', NULL, TRUE),
    (2, 1, 'Jane', 'Doe', NULL, FALSE);

-- Insert test FAQ
INSERT INTO public."FAQs" (id, question, answer) VALUES
    ('test-faq-1', 'What time is the ceremony?', 'The ceremony starts at 4pm.');

-- Insert second test RSVP with different code for additional testing
INSERT INTO public.invitation (id, "isMatthewSide") VALUES
    (2, false);

INSERT INTO public."RSVPs" (
    id,
    invitation_id,
    short_url,
    accepted,
    staying_villa
) VALUES (
    2,
    2,
    'TEST02',
    NULL,
    NULL
);

INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
    (3, 2, 'Alice', 'Smith', NULL, TRUE);

-- Third test invitation with 3 invitees
INSERT INTO public.invitation (id, "isMatthewSide") VALUES
    (3, true);

INSERT INTO public."RSVPs" (
    id,
    invitation_id,
    short_url,
    accepted,
    staying_villa
) VALUES (
    3,
    3,
    'TEST03',
    NULL,
    NULL
);

INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
    (4, 3, 'Michael', 'Johnson', NULL, TRUE),
    (5, 3, 'Sarah', 'Johnson', NULL, FALSE),
    (6, 3, 'Emma', 'Johnson', NULL, FALSE);

-- Fourth test invitation with 4 invitees (family)
INSERT INTO public.invitation (id, "isMatthewSide") VALUES
    (4, false);

INSERT INTO public."RSVPs" (
    id,
    invitation_id,
    short_url,
    accepted,
    staying_villa
) VALUES (
    4,
    4,
    'TEST04',
    NULL,
    NULL
);

INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
    (7, 4, 'James', 'Williams', NULL, TRUE),
    (8, 4, 'Sarah', 'Williams', NULL, FALSE),
    (9, 4, 'Tom', 'Williams', NULL, FALSE),
    (10, 4, 'Lucy', 'Williams', NULL, FALSE);

-- Fifth test invitation with mixed surnames (2 from one family + 1 from another)
-- Expected display: "David, Michael & Emily" (David is primary)
INSERT INTO public.invitation (id, "isMatthewSide") VALUES
    (5, true);

INSERT INTO public."RSVPs" (
    id,
    invitation_id,
    short_url,
    accepted,
    staying_villa
) VALUES (
    5,
    5,
    'TEST05',
    NULL,
    NULL
);

-- David Wilson is the primary guest (our friend), with his partner's family
INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
    (11, 5, 'Michael', 'Carter', NULL, FALSE),
    (12, 5, 'Emily', 'Carter', NULL, FALSE),
    (13, 5, 'David', 'Wilson', NULL, TRUE);

-- Sixth test invitation with villa_offered = false (no room offered)
INSERT INTO public.invitation (id, "isMatthewSide", villa_offered) VALUES
    (6, false, false);

INSERT INTO public."RSVPs" (
    id,
    invitation_id,
    short_url,
    accepted,
    staying_villa
) VALUES (
    6,
    6,
    'TEST06',
    NULL,
    NULL
);

INSERT INTO public.invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
    (14, 6, 'Robert', 'Green', NULL, TRUE);

-- Reset sequences to avoid conflicts with future inserts
SELECT setval('invitation_id_seq', (SELECT MAX(id) FROM invitation));
SELECT setval('invitees_id_seq', (SELECT MAX(id) FROM invitees));
SELECT setval('"RSVPs_id_seq"', (SELECT MAX(id) FROM "RSVPs"));
