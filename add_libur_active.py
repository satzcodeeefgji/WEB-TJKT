#!/usr/bin/env python3
"""
Add is_active column to libur_records table
Run with: python add_libur_active.py
"""

import psycopg2
import sys

def add_libur_active():
    try:
        # Connect to Supabase PostgreSQL
        conn = psycopg2.connect(
            host="vvvnwkdosyartgoyqqgx.db.supabase.co",
            port=5432,
            database="postgres",
            user="postgres",
            password="SATRIA1209!",
            sslmode="require"
        )

        cursor = conn.cursor()

        # SQL to add is_active column
        migration_sql = """
        -- Add is_active column to libur_records table
        ALTER TABLE libur_records ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

        -- Update existing records to be active
        UPDATE libur_records SET is_active = true WHERE is_active IS NULL;

        -- Update RLS policies to allow admin updates
        DROP POLICY IF EXISTS "Allow admin to update libur_records" ON libur_records;
        CREATE POLICY "Allow admin to update libur_records" ON libur_records
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        );
        """

        cursor.execute(migration_sql)
        conn.commit()

        print("✓ Connected to Supabase database")
        print("✓ Added is_active column to libur_records table")
        print("✓ Updated RLS policies for admin updates")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_libur_active()