-- ADIFY migration 004: precision-safe money (integer minor units).
-- New code writes price_amount_minor; price_amount is retained read-only for
-- history and never written by new code paths.

ALTER TABLE events ADD COLUMN IF NOT EXISTS price_amount_minor INTEGER;
UPDATE events
SET price_amount_minor = (price_amount * 100)::INTEGER
WHERE price_amount_minor IS NULL AND price_amount IS NOT NULL;
