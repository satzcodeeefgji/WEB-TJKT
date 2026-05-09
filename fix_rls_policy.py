#!/usr/bin/env python3
"""
Fix RLS Policy - Direct Database Connection
Run with: python fix_rls_policy.py
"""

import psycopg2
import sys

def fix_rls_policy():
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
        
        # SQL to fix RLS policies
        fix_sql = """
        -- Fix RLS policies for students table
        DROP POLICY IF EXISTS "Only admins can create students" ON students;
        DROP POLICY IF EXISTS "Users can create students" ON students;
        DROP POLICY IF EXISTS "Only admins can update students" ON students;
        
        CREATE POLICY "Users can create students"
          ON students FOR INSERT
          WITH CHECK (auth.uid() IS NOT NULL);
        
        CREATE POLICY "Users can update students"
          ON students FOR UPDATE
          WITH CHECK (auth.uid() IS NOT NULL);
        """
        
        cursor.execute(fix_sql)
        conn.commit()
        
        print("✓ Connected to Supabase database")
        print("✓ RLS policies fixed successfully!")
        print("✓ Users can now create student records")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"✗ Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    fix_rls_policy()
