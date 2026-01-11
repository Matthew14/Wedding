-- Test invitations for final testing
-- Use large IDs (9000+) for easy identification and removal
-- Run: DELETE FROM "RSVPs" WHERE id >= 9000; DELETE FROM invitees WHERE id >= 9000; DELETE FROM invitation WHERE id >= 9000;

-- Test Invitation 1: Couple (2 invitees)
INSERT INTO invitation (id, created_at, "isMatthewSide", sent, villa_offered) VALUES
(9001, NOW(), false, false, true);

INSERT INTO "RSVPs" (id, invitation_id, short_url, accepted, staying_villa) VALUES
(9001, 9001, 'TEST91', null, null);

INSERT INTO invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
(9001, 9001, 'Hans', 'Müller', null, true),
(9002, 9001, 'Greta', 'Müller', null, false);

-- Test Invitation 2: Single invitee, villa NOT offered
INSERT INTO invitation (id, created_at, "isMatthewSide", sent, villa_offered) VALUES
(9002, NOW(), false, false, false);

INSERT INTO "RSVPs" (id, invitation_id, short_url, accepted, staying_villa) VALUES
(9002, 9002, 'TEST92', null, null);

INSERT INTO invitees (id, invitation_id, first_name, last_name, coming, is_primary) VALUES
(9003, 9002, 'Klaus', 'Schmidt', null, true);

-- To test these RSVPs, visit:
-- https://oneill.wedding/rsvp/TEST91  (couple with villa offered)
-- https://oneill.wedding/rsvp/TEST92  (single, no villa)

-- To remove test data afterwards:
-- DELETE FROM "RSVPs" WHERE id >= 9000;
-- DELETE FROM invitees WHERE id >= 9000;
-- DELETE FROM invitation WHERE id >= 9000;
