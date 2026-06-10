-- Migration 002: Photo Gallery
-- Run via AWS RDS Query Editor: console → RDS → Query Editor → select cluster, database 'wedding'

CREATE TABLE photo_categories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  description    TEXT,
  event_day      TEXT CHECK (event_day IN ('friday', 'saturday', 'sunday')),
  cover_photo_id UUID,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE photos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_code  VARCHAR(6) REFERENCES invitation_codes(code),
  s3_key           TEXT NOT NULL,
  thumbnail_key    TEXT,
  file_name        TEXT NOT NULL,
  width            INTEGER,
  height           INTEGER,
  size_bytes       BIGINT,
  taken_at         TIMESTAMPTZ,
  category_id      UUID REFERENCES photo_categories(id),
  status           TEXT DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_at      TIMESTAMPTZ DEFAULT NOW(),
  approved_at      TIMESTAMPTZ,
  approved_by      TEXT
);

ALTER TABLE photo_categories
  ADD CONSTRAINT fk_cover_photo FOREIGN KEY (cover_photo_id) REFERENCES photos(id);

CREATE INDEX photos_status_idx   ON photos(status);
CREATE INDEX photos_category_idx ON photos(category_id);
CREATE INDEX photos_code_idx     ON photos(invitation_code);

INSERT INTO photo_categories (name, slug, event_day, sort_order) VALUES
  ('Friday Arrivals', 'friday-arrivals', 'friday',   1),
  ('Ceremony',        'ceremony',        'saturday', 2),
  ('Reception',       'reception',       'saturday', 3),
  ('After Party',     'after-party',     'saturday', 4),
  ('Sunday Brunch',   'sunday-brunch',   'sunday',   5);
