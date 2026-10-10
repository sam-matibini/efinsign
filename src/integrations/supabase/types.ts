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
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          mode: string
          name: string
          organization_id: string
          revoked_at: string | null
          scopes: string[]
          usage_count: number
          usage_limit: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          mode?: string
          name: string
          organization_id: string
          revoked_at?: string | null
          scopes?: string[]
          usage_count?: number
          usage_limit?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          mode?: string
          name?: string
          organization_id?: string
          revoked_at?: string | null
          scopes?: string[]
          usage_count?: number
          usage_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          actor_email: string | null
          actor_ip: string | null
          created_at: string
          details: Json | null
          document_id: string
          event_type: string
          id: string
          organization_id: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_ip?: string | null
          created_at?: string
          details?: Json | null
          document_id: string
          event_type: string
          id?: string
          organization_id?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_ip?: string | null
          created_at?: string
          details?: Json | null
          document_id?: string
          event_type?: string
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          postal_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          postal_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          postal_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_fields: {
        Row: {
          created_at: string
          document_id: string
          field_type: string
          height: number
          id: string
          page_number: number
          signer_id: string
          value: string | null
          width: number
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          document_id: string
          field_type: string
          height: number
          id?: string
          page_number?: number
          signer_id: string
          value?: string | null
          width: number
          x: number
          y: number
        }
        Update: {
          created_at?: string
          document_id?: string
          field_type?: string
          height?: number
          id?: string
          page_number?: number
          signer_id?: string
          value?: string | null
          width?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_fields_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_fields_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "document_signers"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signers: {
        Row: {
          access_token: string
          color: string
          created_at: string
          decline_reason: string | null
          document_id: string
          email: string
          expires_at: string | null
          id: string
          name: string
          signed_at: string | null
          signing_order: number
          status: string
        }
        Insert: {
          access_token?: string
          color?: string
          created_at?: string
          decline_reason?: string | null
          document_id: string
          email: string
          expires_at?: string | null
          id?: string
          name: string
          signed_at?: string | null
          signing_order?: number
          status?: string
        }
        Update: {
          access_token?: string
          color?: string
          created_at?: string
          decline_reason?: string | null
          document_id?: string
          email?: string
          expires_at?: string | null
          id?: string
          name?: string
          signed_at?: string | null
          signing_order?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_signers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          file_path: string | null
          id: string
          organization_id: string | null
          owner_id: string
          signed_file_path: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          id?: string
          organization_id?: string | null
          owner_id: string
          signed_file_path?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          id?: string
          organization_id?: string | null
          owner_id?: string
          signed_file_path?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notifications: {
        Row: {
          created_at: string
          document_id: string
          email: string
          error_message: string | null
          id: string
          signer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          document_id: string
          email: string
          error_message?: string | null
          id?: string
          signer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          email?: string
          error_message?: string | null
          id?: string
          signer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notifications_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "document_signers"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_subscriptions: {
        Row: {
          activated_at: string
          id: string
          organization_id: string
          plan_id: string
          plan_name: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string
          id?: string
          organization_id: string
          plan_id: string
          plan_name: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string
          id?: string
          organization_id?: string
          plan_id?: string
          plan_name?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          cell_number: string | null
          city: string | null
          country: string | null
          created_at: string
          domain: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          postal_code: string | null
          seal_stamp: string | null
          telephone: string | null
        }
        Insert: {
          address?: string | null
          cell_number?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          postal_code?: string | null
          seal_stamp?: string | null
          telephone?: string | null
        }
        Update: {
          address?: string | null
          cell_number?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          postal_code?: string | null
          seal_stamp?: string | null
          telephone?: string | null
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          created_at: string
          currency: string
          features: Json
          highlighted: boolean
          id: string
          max_documents: number | null
          max_users: number | null
          name: string
          period: string
          price_cents: number
          sort_order: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          features?: Json
          highlighted?: boolean
          id?: string
          max_documents?: number | null
          max_users?: number | null
          name: string
          period?: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          features?: Json
          highlighted?: boolean
          id?: string
          max_documents?: number | null
          max_users?: number | null
          name?: string
          period?: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_signatures: {
        Row: {
          created_at: string
          id: string
          image_data: string
          is_default: boolean
          label: string | null
          organization_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_data: string
          is_default?: boolean
          label?: string | null
          organization_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_data?: string
          is_default?: boolean
          label?: string | null
          organization_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          created_at: string
          id: string
          image_data: string
          signer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_data: string
          signer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_data?: string
          signer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "document_signers"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          description: string | null
          fields: Json
          file_path: string | null
          id: string
          organization_id: string | null
          owner_id: string
          signers: Json
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields?: Json
          file_path?: string | null
          id?: string
          organization_id?: string | null
          owner_id: string
          signers?: Json
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fields?: Json
          file_path?: string | null
          id?: string
          organization_id?: string | null
          owner_id?: string
          signers?: Json
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempted_at: string
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          webhook_id: string
        }
        Insert: {
          attempted_at?: string
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id: string
        }
        Update: {
          attempted_at?: string
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          failure_count: number
          id: string
          is_active: boolean
          last_attempt_at: string | null
          last_success_at: string | null
          organization_id: string
          secret: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_attempt_at?: string | null
          last_success_at?: string | null
          organization_id: string
          secret: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_attempt_at?: string | null
          last_success_at?: string | null
          organization_id?: string
          secret?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assign_org_plan: {
        Args: {
          _org_id: string
          _plan_id: string
          _plan_name: string
          _source?: string
        }
        Returns: undefined
      }
      admin_delete_organization: {
        Args: { _org_id: string }
        Returns: undefined
      }
      admin_delete_pricing_plan: {
        Args: { _plan_id: string }
        Returns: undefined
      }
      admin_get_document_analytics: { Args: never; Returns: Json }
      admin_get_organization_detail: {
        Args: { _org_id: string }
        Returns: Json
      }
      admin_grant_role: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      admin_grant_role_by_email: {
        Args: { _email: string }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      admin_list_organizations: {
        Args: never
        Returns: {
          created_at: string
          document_count: number
          member_count: number
          org_id: string
          org_name: string
        }[]
      }
      admin_list_platform_admins: {
        Args: never
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      admin_list_pricing_plans: {
        Args: never
        Returns: {
          created_at: string
          currency: string
          features: Json
          highlighted: boolean
          id: string
          max_documents: number
          max_users: number
          name: string
          period: string
          price_cents: number
          sort_order: number
          updated_at: string
        }[]
      }
      admin_revoke_role: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      admin_search_users: {
        Args: { _query: string }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      admin_update_member_name: {
        Args: { _full_name: string; _org_id: string; _user_id: string }
        Returns: undefined
      }
      admin_update_organization: {
        Args: {
          _address: string
          _city: string
          _country: string
          _email: string
          _name: string
          _org_id: string
          _postal_code: string
          _telephone: string
        }
        Returns: undefined
      }
      admin_update_user_name: {
        Args: { _full_name: string; _user_id: string }
        Returns: undefined
      }
      admin_upsert_pricing_plan: {
        Args: {
          _currency: string
          _features: Json
          _highlighted: boolean
          _id: string
          _max_documents: number
          _max_users: number
          _name: string
          _period: string
          _price_cents: number
          _sort_order: number
        }
        Returns: string
      }
      create_organization_with_admin: {
        Args: { _name: string }
        Returns: string
      }
      get_admin_metrics: { Args: never; Returns: Json }
      get_org_member_emails: {
        Args: { _org_id: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_org_seat_usage: { Args: { _org_id: string }; Returns: Json }
      get_signing_render_data: { Args: { p_token: string }; Returns: Json }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_platform_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      signer_token: { Args: never; Returns: string }
      upsert_own_profile: {
        Args: { _full_name: string }
        Returns: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
      }
    }
    Enums: {
      app_role: "platform_admin"
      org_role: "admin" | "manager" | "signer" | "viewer"
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
      app_role: ["platform_admin"],
      org_role: ["admin", "manager", "signer", "viewer"],
    },
  },
} as const
