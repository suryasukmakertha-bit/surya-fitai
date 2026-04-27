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
      app_config: {
        Row: {
          created_at: string | null
          key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          value?: string
        }
        Relationships: []
      }
      exercise_gif_cache: {
        Row: {
          equipment: string | null
          exercise_name_display: string | null
          exercise_name_normalized: string
          fetched_at: string
          gif_url: string | null
          id: string
          source: string | null
          target_muscle: string | null
          thumbnail_url: string | null
        }
        Insert: {
          equipment?: string | null
          exercise_name_display?: string | null
          exercise_name_normalized: string
          fetched_at?: string
          gif_url?: string | null
          id?: string
          source?: string | null
          target_muscle?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          equipment?: string | null
          exercise_name_display?: string | null
          exercise_name_normalized?: string
          fetched_at?: string
          gif_url?: string | null
          id?: string
          source?: string | null
          target_muscle?: string | null
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          midtrans_order_id: string | null
          midtrans_transaction_id: string | null
          payment_type: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          midtrans_order_id?: string | null
          midtrans_transaction_id?: string | null
          payment_type?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          midtrans_order_id?: string | null
          midtrans_transaction_id?: string | null
          payment_type?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          free_generate_count: number
          free_generate_month: string
          id: string
          last_generate_reset: string | null
          period_generate_count: number
          trial_generate_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          free_generate_count?: number
          free_generate_month?: string
          id?: string
          last_generate_reset?: string | null
          period_generate_count?: number
          trial_generate_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          free_generate_count?: number
          free_generate_month?: string
          id?: string
          last_generate_reset?: string | null
          period_generate_count?: number
          trial_generate_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progress_checkins: {
        Row: {
          created_at: string
          date: string
          id: string
          note: string | null
          plan_id: string | null
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          plan_id?: string | null
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          plan_id?: string | null
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "progress_checkins_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saved_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          lang: string
          last_afternoon_sent: string | null
          last_evening_sent: string | null
          last_morning_sent: string | null
          p256dh: string
          platform: string | null
          timezone: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          lang?: string
          last_afternoon_sent?: string | null
          last_evening_sent?: string | null
          last_morning_sent?: string | null
          p256dh: string
          platform?: string | null
          timezone?: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          lang?: string
          last_afternoon_sent?: string | null
          last_evening_sent?: string | null
          last_morning_sent?: string | null
          p256dh?: string
          platform?: string | null
          timezone?: string
          user_id?: string | null
        }
        Relationships: []
      }
      saved_plans: {
        Row: {
          client_generated_id: string | null
          created_at: string
          food_allergies: string[]
          generate_count: number
          id: string
          injuries: string[]
          plan_completed_at: string | null
          plan_data: Json
          plan_month_number: number
          plan_name: string | null
          plan_started_at: string
          program_type: string
          user_id: string
          user_info: Json
        }
        Insert: {
          client_generated_id?: string | null
          created_at?: string
          food_allergies?: string[]
          generate_count?: number
          id?: string
          injuries?: string[]
          plan_completed_at?: string | null
          plan_data?: Json
          plan_month_number?: number
          plan_name?: string | null
          plan_started_at?: string
          program_type: string
          user_id: string
          user_info?: Json
        }
        Update: {
          client_generated_id?: string | null
          created_at?: string
          food_allergies?: string[]
          generate_count?: number
          id?: string
          injuries?: string[]
          plan_completed_at?: string | null
          plan_data?: Json
          plan_month_number?: number
          plan_name?: string | null
          plan_started_at?: string
          program_type?: string
          user_id?: string
          user_info?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          status: string
          subscription_end: string | null
          subscription_start: string | null
          trial_end: string
          trial_start: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          subscription_end?: string | null
          subscription_start?: string | null
          trial_end?: string
          trial_start?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          subscription_end?: string | null
          subscription_start?: string | null
          trial_end?: string
          trial_start?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          created_at: string
          id: string
          terms_accepted_at: string
          terms_version: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          terms_accepted_at?: string
          terms_version?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          terms_accepted_at?: string
          terms_version?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          plan_goal: string | null
          rating: number | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          plan_goal?: string | null
          rating?: number | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          plan_goal?: string | null
          rating?: number | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workout_checkins: {
        Row: {
          completed_date: string
          created_at: string
          day_label: string
          exercise_name: string
          id: string
          plan_id: string | null
          user_id: string
        }
        Insert: {
          completed_date?: string
          created_at?: string
          day_label: string
          exercise_name: string
          id?: string
          plan_id?: string | null
          user_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          day_label?: string
          exercise_name?: string
          id?: string
          plan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_checkins_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saved_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_completion_audit: {
        Row: {
          action: string
          changed_at: string | null
          completion_id: string | null
          id: string
          new_state: boolean | null
          previous_state: boolean | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          completion_id?: string | null
          id?: string
          new_state?: boolean | null
          previous_state?: boolean | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          completion_id?: string | null
          id?: string
          new_state?: boolean | null
          previous_state?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      workout_completions: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string | null
          day_label: string
          exercise_id: string
          id: string
          plan_id: string
          updated_at: string | null
          user_id: string
          version: number
          workout_date: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string | null
          day_label: string
          exercise_id: string
          id?: string
          plan_id: string
          updated_at?: string | null
          user_id: string
          version?: number
          workout_date?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string | null
          day_label?: string
          exercise_id?: string
          id?: string
          plan_id?: string
          updated_at?: string | null
          user_id?: string
          version?: number
          workout_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_completions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saved_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_workout_progress: {
        Args: {
          p_date: string
          p_plan: string
          p_total: number
          p_user: string
        }
        Returns: number
      }
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
