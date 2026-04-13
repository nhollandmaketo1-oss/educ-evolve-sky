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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          created_at: string
          display_name: string
          id: string
          password: string
          photo: string | null
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          password: string
          photo?: string | null
          role: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          password?: string
          photo?: string | null
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          date: string
          heure: string
          id: string
          personnel_id: string
          present: boolean
        }
        Insert: {
          date: string
          heure: string
          id?: string
          personnel_id: string
          present?: boolean
        }
        Update: {
          date?: string
          heure?: string
          id?: string
          personnel_id?: string
          present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attendance_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          annee_scolaire: string
          coefficient: number
          commentaire: string | null
          created_at: string
          id: string
          matiere: string
          note: number
          student_id: string
          trimestre: number
        }
        Insert: {
          annee_scolaire?: string
          coefficient?: number
          commentaire?: string | null
          created_at?: string
          id?: string
          matiere: string
          note: number
          student_id: string
          trimestre: number
        }
        Update: {
          annee_scolaire?: string
          coefficient?: number
          commentaire?: string | null
          created_at?: string
          id?: string
          matiere?: string
          note?: number
          student_id?: string
          trimestre?: number
        }
        Relationships: [
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          target_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          target_role?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          target_role?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          date: string
          id: string
          mois: string
          montant: number
          status: string
          student_id: string
        }
        Insert: {
          date?: string
          id?: string
          mois: string
          montant: number
          status?: string
          student_id: string
        }
        Update: {
          date?: string
          id?: string
          mois?: string
          montant?: number
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel: {
        Row: {
          created_at: string
          id: string
          matiere: string | null
          nom: string
          prenom: string
          salaire: number
          telephone: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          matiere?: string | null
          nom: string
          prenom: string
          salaire?: number
          telephone?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          matiere?: string | null
          nom?: string
          prenom?: string
          salaire?: number
          telephone?: string | null
          type?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          classe: string
          contact_parent: string | null
          created_at: string
          date_inscription: string
          id: string
          nom: string
          prenom: string
          status: string
        }
        Insert: {
          classe: string
          contact_parent?: string | null
          created_at?: string
          date_inscription?: string
          id?: string
          nom: string
          prenom: string
          status?: string
        }
        Update: {
          classe?: string
          contact_parent?: string | null
          created_at?: string
          date_inscription?: string
          id?: string
          nom?: string
          prenom?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
