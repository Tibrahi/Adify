-- ADIFY migration 002: database-backed image storage (replaces S3).
-- Event posters/covers live in a separate table; events.cover_key references
-- images.id and images are served through a controlled server route.

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  mime TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_images_owner ON images (owner_id);
