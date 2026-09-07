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
      access_logs: {
        Row: {
          action: string
          agent_id: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action?: string
          agent_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          agent_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          agent_id: string | null
          agent_name: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          agent_id?: string | null
          agent_name?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          agent_id?: string | null
          agent_name?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_views: {
        Row: {
          ad_id: string
          agent_id: string
          clicked: boolean | null
          completed: boolean | null
          converted: boolean | null
          device_info: Json | null
          id: string
          view_duration_seconds: number | null
          viewed_at: string
        }
        Insert: {
          ad_id: string
          agent_id: string
          clicked?: boolean | null
          completed?: boolean | null
          converted?: boolean | null
          device_info?: Json | null
          id?: string
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Update: {
          ad_id?: string
          agent_id?: string
          clicked?: boolean | null
          completed?: boolean | null
          converted?: boolean | null
          device_info?: Json | null
          id?: string
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_views_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_announcements: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          priority: string
          starts_at: string
          target_team: string | null
          target_type: string
          target_unit_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          starts_at?: string
          target_team?: string | null
          target_type?: string
          target_unit_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          starts_at?: string
          target_team?: string | null
          target_type?: string
          target_unit_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_announcements_target_unit_id_fkey"
            columns: ["target_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_permissions: {
        Row: {
          can_approve_transfers: boolean | null
          can_delete_agents: boolean | null
          can_manage_ads: boolean | null
          can_manage_agents: boolean | null
          can_manage_announcements: boolean | null
          can_manage_licenses: boolean | null
          can_manage_roles: boolean | null
          can_manage_screens: boolean | null
          can_manage_units: boolean | null
          can_view_analytics: boolean | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_approve_transfers?: boolean | null
          can_delete_agents?: boolean | null
          can_manage_ads?: boolean | null
          can_manage_agents?: boolean | null
          can_manage_announcements?: boolean | null
          can_manage_licenses?: boolean | null
          can_manage_roles?: boolean | null
          can_manage_screens?: boolean | null
          can_manage_units?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_approve_transfers?: boolean | null
          can_delete_agents?: boolean | null
          can_manage_ads?: boolean | null
          can_manage_agents?: boolean | null
          can_manage_announcements?: boolean | null
          can_manage_licenses?: boolean | null
          can_manage_roles?: boolean | null
          can_manage_screens?: boolean | null
          can_manage_units?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          ad_type: string
          click_url: string | null
          content_type: string
          created_at: string
          created_by: string | null
          cta_text: string | null
          description: string | null
          expires_at: string | null
          frequency_limit: number | null
          frequency_type: string | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          media_url: string | null
          min_view_seconds: number | null
          name: string
          priority: number
          starts_at: string | null
          target_teams: string[] | null
          target_unit_ids: string[] | null
          target_user_types: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          ad_type?: string
          click_url?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          cta_text?: string | null
          description?: string | null
          expires_at?: string | null
          frequency_limit?: number | null
          frequency_type?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          media_url?: string | null
          min_view_seconds?: number | null
          name: string
          priority?: number
          starts_at?: string | null
          target_teams?: string[] | null
          target_unit_ids?: string[] | null
          target_user_types?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          ad_type?: string
          click_url?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          cta_text?: string | null
          description?: string | null
          expires_at?: string | null
          frequency_limit?: number | null
          frequency_type?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          media_url?: string | null
          min_view_seconds?: number | null
          name?: string
          priority?: number
          starts_at?: string | null
          target_teams?: string[] | null
          target_unit_ids?: string[] | null
          target_user_types?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_events: {
        Row: {
          agent_id: string
          color: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          event_type: string
          id: string
          is_all_day: boolean | null
          reminder_before: number | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string
          id?: string
          is_all_day?: boolean | null
          reminder_before?: number | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_all_day?: boolean | null
          reminder_before?: number | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_leaves: {
        Row: {
          agent_id: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          end_time: string | null
          hours_count: number | null
          id: string
          leave_type: string
          period: string
          reason: string | null
          start_date: string
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          end_time?: string | null
          hours_count?: number | null
          id?: string
          leave_type: string
          period?: string
          reason?: string | null
          start_date: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          end_time?: string | null
          hours_count?: number | null
          id?: string
          leave_type?: string
          period?: string
          reason?: string | null
          start_date?: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_leaves_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_shifts: {
        Row: {
          agent_id: string
          compensation_date: string | null
          completed_at: string | null
          created_at: string
          end_time: string
          id: string
          is_vacation: boolean
          notes: string | null
          shift_date: string
          shift_type: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          compensation_date?: string | null
          completed_at?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_vacation?: boolean
          notes?: string | null
          shift_date: string
          shift_type?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          compensation_date?: string | null
          completed_at?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_vacation?: boolean
          notes?: string | null
          shift_date?: string
          shift_type?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_shifts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          address: string | null
          age: number | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          bh_future_months_allowed: number | null
          bh_hourly_rate: number | null
          bh_limit: number | null
          bh_limit_1st: number | null
          bh_limit_2nd: number | null
          birth_date: string | null
          blood_type: string | null
          cpf: string | null
          created_at: string
          department: string | null
          email: string | null
          first_shift_date: string | null
          frozen_at: string | null
          frozen_by: string | null
          id: string
          is_active: boolean | null
          is_frozen: boolean | null
          license_expires_at: string | null
          license_notes: string | null
          license_status: string | null
          matricula: string | null
          name: string
          phone: string | null
          position: string | null
          rejection_reason: string | null
          role: string | null
          team: string | null
          unblocked_at: string | null
          unblocked_by: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          bh_future_months_allowed?: number | null
          bh_hourly_rate?: number | null
          bh_limit?: number | null
          bh_limit_1st?: number | null
          bh_limit_2nd?: number | null
          birth_date?: string | null
          blood_type?: string | null
          cpf?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_shift_date?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          id?: string
          is_active?: boolean | null
          is_frozen?: boolean | null
          license_expires_at?: string | null
          license_notes?: string | null
          license_status?: string | null
          matricula?: string | null
          name: string
          phone?: string | null
          position?: string | null
          rejection_reason?: string | null
          role?: string | null
          team?: string | null
          unblocked_at?: string | null
          unblocked_by?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          age?: number | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          bh_future_months_allowed?: number | null
          bh_hourly_rate?: number | null
          bh_limit?: number | null
          bh_limit_1st?: number | null
          bh_limit_2nd?: number | null
          birth_date?: string | null
          blood_type?: string | null
          cpf?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_shift_date?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          id?: string
          is_active?: boolean | null
          is_frozen?: boolean | null
          license_expires_at?: string | null
          license_notes?: string | null
          license_status?: string | null
          matricula?: string | null
          name?: string
          phone?: string | null
          position?: string | null
          rejection_reason?: string | null
          role?: string | null
          team?: string | null
          unblocked_at?: string | null
          unblocked_by?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      bh_monthly_cycles: {
        Row: {
          agent_id: string
          closed_at: string | null
          created_at: string
          credit_hours: number
          debit_hours: number
          estimated_value: number | null
          fortnight_1_hours: number
          fortnight_2_hours: number
          hourly_rate: number | null
          id: string
          month: number
          total_entries: number
          total_hours: number
          updated_at: string
          year: number
        }
        Insert: {
          agent_id: string
          closed_at?: string | null
          created_at?: string
          credit_hours?: number
          debit_hours?: number
          estimated_value?: number | null
          fortnight_1_hours?: number
          fortnight_2_hours?: number
          hourly_rate?: number | null
          id?: string
          month: number
          total_entries?: number
          total_hours?: number
          updated_at?: string
          year: number
        }
        Update: {
          agent_id?: string
          closed_at?: string | null
          created_at?: string
          credit_hours?: number
          debit_hours?: number
          estimated_value?: number | null
          fortnight_1_hours?: number
          fortnight_2_hours?: number
          hourly_rate?: number | null
          id?: string
          month?: number
          total_entries?: number
          total_hours?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "bh_monthly_cycles_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          room_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_members: {
        Row: {
          agent_id: string
          id: string
          joined_at: string
          room_id: string
        }
        Insert: {
          agent_id: string
          id?: string
          joined_at?: string
          room_id: string
        }
        Update: {
          agent_id?: string
          id?: string
          joined_at?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_members_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          id: string
          name: string
          team: string | null
          type: string
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          team?: string | null
          type?: string
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          team?: string | null
          type?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      cpf_change_log: {
        Row: {
          agent_id: string
          agent_name: string | null
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          id: string
          new_cpf: string
          old_cpf: string | null
          operation: string
        }
        Insert: {
          agent_id: string
          agent_name?: string | null
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          new_cpf: string
          old_cpf?: string | null
          operation: string
        }
        Update: {
          agent_id?: string
          agent_name?: string | null
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          new_cpf?: string
          old_cpf?: string | null
          operation?: string
        }
        Relationships: []
      }
      deleted_messages: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          message_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          message_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deleted_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deleted_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_screens: {
        Row: {
          content: Json | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          screen_type: string
          show_on_login: boolean | null
          slug: string
          starts_at: string | null
          styles: Json | null
          subtitle: string | null
          target_user_types: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          screen_type?: string
          show_on_login?: boolean | null
          slug: string
          starts_at?: string | null
          styles?: Json | null
          subtitle?: string | null
          target_user_types?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          screen_type?: string
          show_on_login?: boolean | null
          slug?: string
          starts_at?: string | null
          styles?: Json | null
          subtitle?: string | null
          target_user_types?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      external_database_configs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          supabase_anon_key: string
          supabase_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          supabase_anon_key: string
          supabase_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          supabase_anon_key?: string
          supabase_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      license_activation_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_days: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_days?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_days?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
        }
        Relationships: []
      }
      license_code_usage: {
        Row: {
          activated_at: string
          agent_id: string
          code_id: string
          id: string
          new_expires_at: string
          previous_expires_at: string | null
          previous_status: string | null
        }
        Insert: {
          activated_at?: string
          agent_id: string
          code_id: string
          id?: string
          new_expires_at: string
          previous_expires_at?: string | null
          previous_status?: string | null
        }
        Update: {
          activated_at?: string
          agent_id?: string
          code_id?: string
          id?: string
          new_expires_at?: string
          previous_expires_at?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_code_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_code_usage_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "license_activation_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_time: string
          id: string
          identifier: string
          ip_address: string | null
          success: boolean | null
        }
        Insert: {
          attempt_time?: string
          id?: string
          identifier: string
          ip_address?: string | null
          success?: boolean | null
        }
        Update: {
          attempt_time?: string
          id?: string
          identifier?: string
          ip_address?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      master_admin: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      master_session_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      night_shift_overrides: {
        Row: {
          applied_end_time: string
          applied_start_time: string
          created_at: string
          id: string
          local_time_acre: string
          original_end_time: string
          original_start_time: string
          reason: string
          server_time_at_override: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          applied_end_time: string
          applied_start_time: string
          created_at?: string
          id?: string
          local_time_acre?: string
          original_end_time: string
          original_start_time: string
          reason: string
          server_time_at_override?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          applied_end_time?: string
          applied_start_time?: string
          created_at?: string
          id?: string
          local_time_acre?: string
          original_end_time?: string
          original_start_time?: string
          reason?: string
          server_time_at_override?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "night_shift_overrides_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "round_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          agent_id: string
          content: string | null
          created_at: string
          id: string
          is_read: boolean
          title: string
          type: string
        }
        Insert: {
          agent_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          type?: string
        }
        Update: {
          agent_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_license_cache: {
        Row: {
          agent_id: string
          cached_at: string
          cpf: string
          id: string
          last_sync: string
          license_expires_at: string | null
          license_status: string
          name: string
          password_hash: string | null
          team: string | null
          unit_id: string | null
        }
        Insert: {
          agent_id: string
          cached_at?: string
          cpf: string
          id?: string
          last_sync?: string
          license_expires_at?: string | null
          license_status?: string
          name: string
          password_hash?: string | null
          team?: string | null
          unit_id?: string | null
        }
        Update: {
          agent_id?: string
          cached_at?: string
          cpf?: string
          id?: string
          last_sync?: string
          license_expires_at?: string | null
          license_status?: string
          name?: string
          password_hash?: string | null
          team?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_license_cache_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_license_cache_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_bank: {
        Row: {
          agent_id: string
          created_at: string
          description: string | null
          hours: number
          id: string
          operation_type: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          description?: string | null
          hours?: number
          id?: string
          operation_type?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          description?: string | null
          hours?: number
          id?: string
          operation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_bank_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      password_change_requests: {
        Row: {
          admin_notes: string | null
          agent_id: string
          created_at: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          agent_id: string
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          agent_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_change_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          agent_id: string
          amount: number
          created_at: string
          id: string
          months_paid: number
          notes: string | null
          payment_date: string
          payment_method: string | null
          registered_by: string | null
        }
        Insert: {
          agent_id: string
          amount?: number
          created_at?: string
          id?: string
          months_paid?: number
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          registered_by?: string | null
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string
          id?: string
          months_paid?: number
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          registered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_registrations_log: {
        Row: {
          agent_cpf: string
          agent_id: string
          agent_name: string
          created_at: string | null
          id: string
          team: string | null
          unit_id: string | null
          viewed_at: string | null
          viewed_by_admin: boolean | null
        }
        Insert: {
          agent_cpf: string
          agent_id: string
          agent_name: string
          created_at?: string | null
          id?: string
          team?: string | null
          unit_id?: string | null
          viewed_at?: string | null
          viewed_by_admin?: boolean | null
        }
        Update: {
          agent_cpf?: string
          agent_id?: string
          agent_name?: string
          created_at?: string | null
          id?: string
          team?: string | null
          unit_id?: string | null
          viewed_at?: string | null
          viewed_by_admin?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_registrations_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_registrations_log_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          home_card_order: Json | null
          id: string
          password_changed_at: string | null
          reminder_settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_card_order?: Json | null
          id?: string
          password_changed_at?: string | null
          reminder_settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_card_order?: Json | null
          id?: string
          password_changed_at?: string | null
          reminder_settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      round_sessions: {
        Row: {
          auto_started: boolean
          created_at: string
          end_time: string
          ended_at: string | null
          id: string
          interval_min: number
          is_active: boolean
          mode: string
          notified_indices: number[]
          require_confirmation_to_stop: boolean
          rows: Json
          scheduled_round_id: string | null
          server_started_at: string
          start_time: string
          stop_confirmed_at: string | null
          stop_confirmed_by: string | null
          team: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_started?: boolean
          created_at?: string
          end_time: string
          ended_at?: string | null
          id?: string
          interval_min?: number
          is_active?: boolean
          mode: string
          notified_indices?: number[]
          require_confirmation_to_stop?: boolean
          rows?: Json
          scheduled_round_id?: string | null
          server_started_at?: string
          start_time: string
          stop_confirmed_at?: string | null
          stop_confirmed_by?: string | null
          team: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_started?: boolean
          created_at?: string
          end_time?: string
          ended_at?: string | null
          id?: string
          interval_min?: number
          is_active?: boolean
          mode?: string
          notified_indices?: number[]
          require_confirmation_to_stop?: boolean
          rows?: Json
          scheduled_round_id?: string | null
          server_started_at?: string
          start_time?: string
          stop_confirmed_at?: string | null
          stop_confirmed_by?: string | null
          team?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_sessions_scheduled_round_id_fkey"
            columns: ["scheduled_round_id"]
            isOneToOne: false
            referencedRelation: "scheduled_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_credentials: {
        Row: {
          agent_id: string
          browser: string | null
          cpf: string
          created_at: string
          device_id: string | null
          device_name: string | null
          encrypted_token: string | null
          id: string
          is_active: boolean | null
          last_ip: string | null
          last_login_at: string | null
          name: string | null
          os: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          browser?: string | null
          cpf: string
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          encrypted_token?: string | null
          id?: string
          is_active?: boolean | null
          last_ip?: string | null
          last_login_at?: string | null
          name?: string | null
          os?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          browser?: string | null
          cpf?: string
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          encrypted_token?: string | null
          id?: string
          is_active?: boolean | null
          last_ip?: string | null
          last_login_at?: string | null
          name?: string | null
          os?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_credentials_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_rounds: {
        Row: {
          active_from: string | null
          active_until: string | null
          created_at: string
          created_by: string | null
          id: string
          interval_minutes: number | null
          is_enabled: boolean
          last_triggered_at: string | null
          mode: string
          name: string
          next_trigger_at: string | null
          notes: string | null
          recur_times: string[] | null
          recur_weekdays: number[] | null
          require_confirmation_to_stop: boolean
          ronda_duration_min: number
          round_end_time: string
          round_interval_min: number
          round_mode: string
          round_start_time: string
          scheduled_at: string | null
          team: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          active_from?: string | null
          active_until?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interval_minutes?: number | null
          is_enabled?: boolean
          last_triggered_at?: string | null
          mode: string
          name: string
          next_trigger_at?: string | null
          notes?: string | null
          recur_times?: string[] | null
          recur_weekdays?: number[] | null
          require_confirmation_to_stop?: boolean
          ronda_duration_min?: number
          round_end_time?: string
          round_interval_min?: number
          round_mode?: string
          round_start_time?: string
          scheduled_at?: string | null
          team: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          active_from?: string | null
          active_until?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interval_minutes?: number | null
          is_enabled?: boolean
          last_triggered_at?: string | null
          mode?: string
          name?: string
          next_trigger_at?: string | null
          notes?: string | null
          recur_times?: string[] | null
          recur_weekdays?: number[] | null
          require_confirmation_to_stop?: boolean
          ronda_duration_min?: number
          round_end_time?: string
          round_interval_min?: number
          round_mode?: string
          round_start_time?: string
          scheduled_at?: string | null
          team?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_rounds_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_views: {
        Row: {
          agent_id: string
          id: string
          interactions: Json | null
          screen_id: string
          viewed_at: string
        }
        Insert: {
          agent_id: string
          id?: string
          interactions?: Json | null
          screen_id: string
          viewed_at?: string
        }
        Update: {
          agent_id?: string
          id?: string
          interactions?: Json | null
          screen_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_views_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "dynamic_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_alerts: {
        Row: {
          agent_id: string
          alert_type: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          scheduled_for: string | null
          sent_at: string | null
          shift_id: string | null
          title: string
        }
        Insert: {
          agent_id: string
          alert_type: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          scheduled_for?: string | null
          sent_at?: string | null
          shift_id?: string | null
          title: string
        }
        Update: {
          agent_id?: string
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          scheduled_for?: string | null
          sent_at?: string | null
          shift_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_alerts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_briefings: {
        Row: {
          adolescents_counted: number | null
          adolescents_expected: number | null
          agent_id: string
          book_entry: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          handcuff_keys_counted: number | null
          handcuff_keys_expected: number | null
          handcuffs_counted: number | null
          handcuffs_expected: number | null
          handover_notes: string | null
          handover_ok: boolean
          id: string
          observations: string | null
          radios: Json
          radios_charged_count: number | null
          radios_total_expected: number | null
          schedule_notes: string | null
          schedule_ok: boolean
          shift_date: string
          shift_id: string | null
          signature: string | null
          team: string | null
          tonfas_counted: number | null
          tonfas_expected: number | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          adolescents_counted?: number | null
          adolescents_expected?: number | null
          agent_id: string
          book_entry?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          handcuff_keys_counted?: number | null
          handcuff_keys_expected?: number | null
          handcuffs_counted?: number | null
          handcuffs_expected?: number | null
          handover_notes?: string | null
          handover_ok?: boolean
          id?: string
          observations?: string | null
          radios?: Json
          radios_charged_count?: number | null
          radios_total_expected?: number | null
          schedule_notes?: string | null
          schedule_ok?: boolean
          shift_date: string
          shift_id?: string | null
          signature?: string | null
          team?: string | null
          tonfas_counted?: number | null
          tonfas_expected?: number | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          adolescents_counted?: number | null
          adolescents_expected?: number | null
          agent_id?: string
          book_entry?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          handcuff_keys_counted?: number | null
          handcuff_keys_expected?: number | null
          handcuffs_counted?: number | null
          handcuffs_expected?: number | null
          handover_notes?: string | null
          handover_ok?: boolean
          id?: string
          observations?: string | null
          radios?: Json
          radios_charged_count?: number | null
          radios_total_expected?: number | null
          schedule_notes?: string | null
          schedule_ok?: boolean
          shift_date?: string
          shift_id?: string | null
          signature?: string | null
          team?: string | null
          tonfas_counted?: number | null
          tonfas_expected?: number | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_briefings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_briefings_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "agent_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_briefings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_checklists: {
        Row: {
          agent_id: string
          checklist: Json
          created_at: string
          id: string
          observations: string
          shift_id: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          checklist?: Json
          created_at?: string
          id?: string
          observations?: string
          shift_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          checklist?: Json
          created_at?: string
          id?: string
          observations?: string
          shift_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_checklists_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_checklists_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "agent_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_schedule_divergences: {
        Row: {
          agent_id: string
          detected_at: string
          divergence_type: string
          expected_date: string | null
          first_shift_date: string | null
          id: string
          local_today: string | null
          notes: string | null
          shift_date: string
        }
        Insert: {
          agent_id: string
          detected_at?: string
          divergence_type: string
          expected_date?: string | null
          first_shift_date?: string | null
          id?: string
          local_today?: string | null
          notes?: string | null
          shift_date: string
        }
        Update: {
          agent_id?: string
          detected_at?: string
          divergence_type?: string
          expected_date?: string | null
          first_shift_date?: string | null
          id?: string
          local_today?: string | null
          notes?: string | null
          shift_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_schedule_divergences_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swaps: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          requester_id: string
          requester_shift_id: string
          status: string
          target_id: string
          target_shift_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          requester_id: string
          requester_shift_id: string
          status?: string
          target_id: string
          target_shift_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          requester_id?: string
          requester_shift_id?: string
          status?: string
          target_id?: string
          target_shift_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swaps_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_requester_shift_id_fkey"
            columns: ["requester_shift_id"]
            isOneToOne: false
            referencedRelation: "agent_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_target_shift_id_fkey"
            columns: ["target_shift_id"]
            isOneToOne: false
            referencedRelation: "agent_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          agent_id: string
          created_at: string
          end_time: string
          id: string
          notes: string | null
          shift_date: string
          shift_type: string
          start_time: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          shift_date: string
          shift_type?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          shift_date?: string
          shift_type?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      team_lock_state: {
        Row: {
          created_at: string
          scheduled_for: string | null
          team: string
          team_confirmed: boolean
          unit_id: string
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          created_at?: string
          scheduled_for?: string | null
          team: string
          team_confirmed?: boolean
          unit_id: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          created_at?: string
          scheduled_for?: string | null
          team?: string
          team_confirmed?: boolean
          unit_id?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: []
      }
      team_round_log: {
        Row: {
          agents_count: number | null
          completed_at: string
          completed_by: string
          created_at: string
          id: string
          saved_name: string
          team: string
          total_seconds: number | null
          unit_id: string | null
        }
        Insert: {
          agents_count?: number | null
          completed_at?: string
          completed_by: string
          created_at?: string
          id?: string
          saved_name: string
          team: string
          total_seconds?: number | null
          unit_id?: string | null
        }
        Update: {
          agents_count?: number | null
          completed_at?: string
          completed_by?: string
          created_at?: string
          id?: string
          saved_name?: string
          team?: string
          total_seconds?: number | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_round_log_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_requests: {
        Row: {
          agent_id: string
          created_at: string
          from_team: string
          from_unit_id: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          to_team: string
          to_unit_id: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          from_team: string
          from_unit_id: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_team: string
          to_unit_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          from_team?: string
          from_unit_id?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_team?: string
          to_unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_from_unit_id_fkey"
            columns: ["from_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_to_unit_id_fkey"
            columns: ["to_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address: string | null
          bh_hourly_rate_default: number | null
          bh_limit_1st_default: number | null
          bh_limit_2nd_default: number | null
          bh_lock_agent_edit: boolean | null
          coordinator_name: string | null
          created_at: string
          director_name: string | null
          email: string | null
          id: string
          municipality: string
          name: string
          phone: string | null
          president_name: string | null
          security_coordinator_name: string | null
        }
        Insert: {
          address?: string | null
          bh_hourly_rate_default?: number | null
          bh_limit_1st_default?: number | null
          bh_limit_2nd_default?: number | null
          bh_lock_agent_edit?: boolean | null
          coordinator_name?: string | null
          created_at?: string
          director_name?: string | null
          email?: string | null
          id?: string
          municipality: string
          name: string
          phone?: string | null
          president_name?: string | null
          security_coordinator_name?: string | null
        }
        Update: {
          address?: string | null
          bh_hourly_rate_default?: number | null
          bh_limit_1st_default?: number | null
          bh_limit_2nd_default?: number | null
          bh_lock_agent_edit?: boolean | null
          coordinator_name?: string | null
          created_at?: string
          director_name?: string | null
          email?: string | null
          id?: string
          municipality?: string
          name?: string
          phone?: string | null
          president_name?: string | null
          security_coordinator_name?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_license_with_code: {
        Args: { p_agent_id?: string; p_code: string }
        Returns: Json
      }
      agents_same_unit: {
        Args: { agent_id_1: string; agent_id_2: string }
        Returns: boolean
      }
      calc_next_scheduled_round_trigger: {
        Args: {
          p_active_from: string
          p_active_until: string
          p_interval_minutes: number
          p_last_triggered_at: string
          p_mode: string
          p_recur_times: string[]
          p_recur_weekdays: number[]
          p_scheduled_at: string
        }
        Returns: string
      }
      calculate_bh_balance: { Args: { p_agent_id: string }; Returns: number }
      calculate_bh_value: { Args: { p_agent_id: string }; Returns: number }
      check_agent_shift_divergences: {
        Args: { p_agent_id: string; p_months_ahead?: number }
        Returns: {
          divergence_type: string
          expected_date: string
          notes: string
          shift_date: string
        }[]
      }
      check_existing_cpfs: {
        Args: { _cpfs: string[] }
        Returns: {
          cpf: string
        }[]
      }
      check_matricula_exists: {
        Args: { _matricula: string }
        Returns: {
          id: string
          matricula: string
        }[]
      }
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_old_bh_data: { Args: { p_agent_id?: string }; Returns: number }
      cleanup_orphan_auth_user: { Args: { p_email: string }; Returns: boolean }
      close_bh_month: {
        Args: { p_agent_id: string; p_month: number; p_year: number }
        Returns: string
      }
      create_shift_reminder: {
        Args: { p_agent_id: string; p_shift_date: string; p_shift_id?: string }
        Returns: undefined
      }
      current_agent_id: { Args: never; Returns: string }
      current_agent_unit_id: { Args: never; Returns: string }
      extend_license: {
        Args: { p_admin_id: string; p_agent_id: string; p_months: number }
        Returns: string
      }
      generate_agent_shifts: {
        Args: {
          p_agent_id: string
          p_first_shift_date: string
          p_months_ahead?: number
        }
        Returns: number
      }
      get_agent_shift_status: {
        Args: { _agent_id: string }
        Returns: {
          end_time: string
          is_on_duty: boolean
          seconds_remaining: number
          shift_date: string
          shift_end_ts: string
          shift_id: string
          shift_start_ts: string
          start_time: string
        }[]
      }
      get_public_operational_counts: {
        Args: never
        Returns: {
          agents_active: number
          agents_total: number
          units_count: number
        }[]
      }
      get_public_team_counts: {
        Args: never
        Returns: {
          active: number
          team: string
          total: number
        }[]
      }
      get_server_now: { Args: never; Returns: string }
      has_admin_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_round_session_override: {
        Args: {
          p_end_time: string
          p_interval_min: number
          p_mode: string
          p_reason: string
          p_rows: Json
          p_server_started_at: string
          p_start_time: string
          p_team: string
        }
        Returns: string
      }
      is_admin_or_master: { Args: { _user_id: string }; Returns: boolean }
      is_license_expired: { Args: { p_agent_id: string }; Returns: boolean }
      is_night_window: { Args: { p_ts?: string }; Returns: boolean }
      is_own_agent: { Args: { check_agent_id: string }; Returns: boolean }
      is_same_unit: { Args: { shift_agent_id: string }; Returns: boolean }
      list_agents_same_team: {
        Args: never
        Returns: {
          approval_status: string
          avatar_url: string
          id: string
          is_active: boolean
          is_frozen: boolean
          license_status: string
          matricula: string
          name: string
          position: string
          role: string
          team: string
          unit_name: string
        }[]
      }
      list_agents_same_unit: {
        Args: never
        Returns: {
          approval_status: string
          avatar_url: string
          id: string
          is_active: boolean
          is_frozen: boolean
          license_status: string
          matricula: string
          name: string
          position: string
          role: string
          team: string
          unit_name: string
        }[]
      }
      list_agents_system: {
        Args: never
        Returns: {
          approval_status: string
          avatar_url: string
          id: string
          is_active: boolean
          is_frozen: boolean
          license_status: string
          matricula: string
          name: string
          position: string
          team: string
          unit_municipality: string
          unit_name: string
        }[]
      }
      list_units_basic: {
        Args: never
        Returns: {
          address: string
          coordinator_name: string
          director_name: string
          email: string
          id: string
          municipality: string
          name: string
          phone: string
        }[]
      }
      lookup_agent_for_login: {
        Args: { _cpf: string }
        Returns: {
          email: string
          id: string
          is_active: boolean
          is_frozen: boolean
          license_expires_at: string
          license_status: string
          matricula: string
          name: string
          team: string
          unit_municipality: string
          unit_name: string
        }[]
      }
      recalc_stale_shift_statuses: { Args: never; Returns: number }
      record_login_attempt: {
        Args: { p_identifier: string; p_ip?: string; p_success: boolean }
        Returns: undefined
      }
      set_night_override_reason: {
        Args: { p_reason: string }
        Returns: undefined
      }
      sync_offline_license_cache: { Args: never; Returns: number }
      toggle_agent_freeze: {
        Args: { p_admin_id: string; p_agent_id: string; p_freeze: boolean }
        Returns: boolean
      }
      verify_master_admin: {
        Args: { p_password: string; p_username: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "master" | "editor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user", "master", "editor"],
    },
  },
} as const
