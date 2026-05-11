export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nisn: string;
          role: "admin" | "user";
          created_at: string;
        };
        Insert: {
          id: string;
          nisn: string;
          role?: "admin" | "user";
          created_at?: string;
        };
        Update: {
          id?: string;
          nisn?: string;
          role?: "admin" | "user";
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          deadline: string | null;
          photo_paths: string[];
          edited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          deadline?: string | null;
          photo_paths?: string[];
          edited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          deadline?: string | null;
          photo_paths?: string[];
          edited_by?: string | null;
          created_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          name: string;
          absen: string;
          nisn: string;
          saldo_awal: number;
          phone: string | null;
          profile_photo_path: string | null;
          is_profile_complete: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          absen: string;
          nisn: string;
          saldo_awal?: number;
          phone?: string | null;
          profile_photo_path?: string | null;
          is_profile_complete?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          absen?: string;
          nisn?: string;
          saldo_awal?: number;
          phone?: string | null;
          profile_photo_path?: string | null;
          is_profile_complete?: boolean;
          created_at?: string;
        };
      };
      kas_payments: {
        Row: {
          id: string;
          student_id: string;
          paid_date: string;
          kind: "kas" | "tabungan";
          edited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          paid_date: string;
          kind?: "kas" | "tabungan";
          edited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          paid_date?: string;
          kind?: "kas" | "tabungan";
          edited_by?: string | null;
          created_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          description: string;
          expense_date: string;
          amount: number;
          edited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          description: string;
          expense_date: string;
          amount: number;
          edited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          description?: string;
          expense_date?: string;
          amount?: number;
          edited_by?: string | null;
          created_at?: string;
        };
      };
      documentation: {
        Row: {
          id: string;
          title: string;
          caption: string;
          image_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          caption: string;
          image_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          caption?: string;
          image_path?: string;
          created_at?: string;
        };
      };
      libur_records: {
        Row: {
          id: string;
          student_id: string;
          libur_date: string;
          created_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          student_id: string;
          libur_date: string;
          created_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          student_id?: string;
          libur_date?: string;
          created_at?: string;
          is_active?: boolean;
        };
      };
      saldo_deductions: {
        Row: {
          id: string;
          student_id: string;
          expense_id: string;
          deduction_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          expense_id: string;
          deduction_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          expense_id?: string;
          deduction_amount?: number;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
