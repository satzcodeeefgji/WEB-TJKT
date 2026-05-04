-- Add kind column to kas_payments for kas/tabungan support
ALTER TABLE kas_payments
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'kas';

ALTER TABLE kas_payments
  ADD CONSTRAINT IF NOT EXISTS kas_payments_kind_check
  CHECK (kind IN ('kas', 'tabungan'));
