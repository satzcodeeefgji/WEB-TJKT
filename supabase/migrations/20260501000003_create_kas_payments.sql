-- Create kas_payments table
CREATE TABLE IF NOT EXISTS kas_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  paid_date TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'kas',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CHECK (kind IN ('kas', 'tabungan'))
);

-- Enable RLS
ALTER TABLE kas_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kas_payments
CREATE POLICY "Everyone can view kas_payments"
  ON kas_payments FOR SELECT
  USING (true);

CREATE POLICY "Only admins can create kas_payments"
  ON kas_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete kas_payments"
  ON kas_payments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
