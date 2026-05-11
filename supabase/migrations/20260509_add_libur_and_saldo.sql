-- Add libur status table for tracking days off
CREATE TABLE IF NOT EXISTS libur_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  libur_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, libur_date)
);

-- Enable RLS
ALTER TABLE libur_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for libur_records
CREATE POLICY "Everyone can view libur_records"
  ON libur_records FOR SELECT
  USING (true);

CREATE POLICY "Only admins can create libur_records"
  ON libur_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete libur_records"
  ON libur_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add saldo tracking for expense deductions
CREATE TABLE IF NOT EXISTS saldo_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  deduction_amount BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, expense_id)
);

-- Enable RLS
ALTER TABLE saldo_deductions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saldo_deductions
CREATE POLICY "Everyone can view saldo_deductions"
  ON saldo_deductions FOR SELECT
  USING (true);

CREATE POLICY "Only admins can create saldo_deductions"
  ON saldo_deductions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
