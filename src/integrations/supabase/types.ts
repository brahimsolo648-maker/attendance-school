export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      absence_lists: {
        Row: {
          id: string
          section_id: string
          signature_url: string | null
          subject: string
          submitted_at: string
          teacher_id: string
        }
        Insert: {
          id?: string
          section_id: string
          signature_url?: string | null
          subject: string
          submitted_at?: string
          teacher_id: string
        }
        Update: {
          id?: string
          section_id?: string
          signature_url?: string | null
          subject?: string
          submitted_at?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_lists_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_lists_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      absence_records: {
        Row: {
          absence_list_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          absence_list_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          absence_list_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_records_absence_list_id_fkey"
            columns: ["absence_list_id"]
            isOneToOne: false
            referencedRelation: "absence_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          date: string
          id: string
          student_id: string
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          id?: string
          student_id: string
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      import_history: {
        Row: {
          admin_id: string | null
          error_message: string | null
          file_name: string
          file_type: string | null
          id: string
          import_date: string
          section_id: string | null
          status: string
          students_failed: number
          students_imported: number
        }
        Insert: {
          admin_id?: string | null
          error_message?: string | null
          file_name: string
          file_type?: string | null
          id?: string
          import_date?: string
          section_id?: string | null
          status?: string
          students_failed?: number
          students_imported?: number
        }
        Update: {
          admin_id?: string | null
          error_message?: string | null
          file_name?: string
          file_type?: string | null
          id?: string
          import_date?: string
          section_id?: string | null
          status?: string
          students_failed?: number
          students_imported?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_history_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string
          full_name: string
          id: string
          name: string
          year: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          name: string
          year: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          name?: string
          year?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          ban_custom_reason: string | null
          ban_end_date: string | null
          ban_reason: Database["public"]["Enums"]["ban_reason"] | null
          ban_start_date: string | null
          ban_subject: string | null
          barcode_number: string | null
          birth_date: string | null
          created_at: string
          first_name: string
          id: string
          is_banned: boolean
          last_name: string
          photo_url: string | null
          section_id: string
          student_code: string | null
        }
        Insert: {
          ban_custom_reason?: string | null
          ban_end_date?: string | null
          ban_reason?: Database["public"]["Enums"]["ban_reason"] | null
          ban_start_date?: string | null
          ban_subject?: string | null
          barcode_number?: string | null
          birth_date?: string | null
          created_at?: string
          first_name: string
          id?: string
          is_banned?: boolean
          last_name: string
          photo_url?: string | null
          section_id: string
          student_code?: string | null
        }
        Update: {
          ban_custom_reason?: string | null
          ban_end_date?: string | null
          ban_reason?: Database["public"]["Enums"]["ban_reason"] | null
          ban_start_date?: string | null
          ban_subject?: string | null
          barcode_number?: string | null
          birth_date?: string | null
          created_at?: string
          first_name?: string
          id?: string
          is_banned?: boolean
          last_name?: string
          photo_url?: string | null
          section_id?: string
          student_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      system_notifications: {
        Row: {
          created_at: string
          days_absent: number
          first_absence_date: string
          id: string
          is_resolved: boolean
          last_absence_date: string | null
          notes: string | null
          notification_type: string
          resolved_at: string | null
          resolved_by: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          days_absent: number
          first_absence_date: string
          id?: string
          is_resolved?: boolean
          last_absence_date?: string | null
          notes?: string | null
          notification_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          days_absent?: number
          first_absence_date?: string
          id?: string
          is_resolved?: boolean
          last_absence_date?: string | null
          notes?: string | null
          notification_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
          value_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
          value_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
          value_type?: string
        }
        Relationships: []
      }
      teacher_sections: {
        Row: {
          created_at: string
          id: string
          section_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          section_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          section_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_sections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_sections_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          approved_at: string | null
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          signature_url: string | null
          status: Database["public"]["Enums"]["approval_status"]
          subject: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          signature_url?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          subject: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          signature_url?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          code: string
          code_type: string
          created_at: string
          email_target: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          code: string
          code_type: string
          created_at?: string
          email_target: string
          expires_at: string
          id?: string
          used_at?: string | null
          user_id: string
          user_type?: string
        }
        Update: {
          code?: string
          code_type?: string
          created_at?: string
          email_target?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_create_notification: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      get_student_absence_days: {
        Args: { p_student_id: string }
        Returns: number
      }
      get_teacher_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher"
      approval_status: "pending" | "approved" | "rejected"
      ban_reason: "استدعاء" | "تقرير" | "شيء آخر"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher"],
      approval_status: ["pending", "approved", "rejected"],
      ban_reason: ["استدعاء", "تقرير", "شيء آخر"],
    },
  },
} as const
