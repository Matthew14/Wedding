-- Aurora PostgreSQL 16 schema for oneill.wedding
-- Run after Aurora cluster is provisioned and DB connectivity verified.

CREATE TABLE IF NOT EXISTS invitations (
    id              BIGINT PRIMARY KEY,
    is_matthew_side BOOLEAN NOT NULL DEFAULT TRUE,
    sent            BOOLEAN NOT NULL DEFAULT FALSE,
    villa_offered   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invitation_codes (
    code            VARCHAR(6)  PRIMARY KEY,  -- 6-char short URL (was RSVPs.short_url)
    invitation_id   BIGINT      NOT NULL REFERENCES invitations(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitation_codes_invitation_id
    ON invitation_codes(invitation_id);

CREATE TABLE IF NOT EXISTS rsvp_archive (
    id                   BIGINT PRIMARY KEY,
    invitation_id        BIGINT   NOT NULL REFERENCES invitations(id),
    code                 VARCHAR(6) REFERENCES invitation_codes(code),
    accepted             BOOLEAN,
    staying_villa        BOOLEAN,
    dietary_restrictions TEXT,
    song_request         TEXT,
    travel_plans         TEXT,
    message              TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_archive_invitation_id
    ON rsvp_archive(invitation_id);

CREATE TABLE IF NOT EXISTS invitee_archive (
    id            BIGINT PRIMARY KEY,
    invitation_id BIGINT NOT NULL REFERENCES invitations(id),
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    coming        BOOLEAN,
    is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
    table_number  INT,
    seat_number   INT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitee_archive_invitation_id
    ON invitee_archive(invitation_id);

CREATE TABLE IF NOT EXISTS faqs (
    id         TEXT PRIMARY KEY,
    question   TEXT NOT NULL,
    answer     TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
