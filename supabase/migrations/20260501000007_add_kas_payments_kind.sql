-- Add kind column to kas_payments for kas/tabungan support
ALTER TABLE kas_payments
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'kas';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kas_payments_kind_check'
      AND conrelid = 'kas_payments'::regclass
  ) THEN
    ALTER TABLE kas_payments
      ADD CONSTRAINT kas_payments_kind_check
      CHECK (kind IN ('kas', 'tabungan'));
  END IF;
END$$;
