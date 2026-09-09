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
          clicked: boolean
          completed: boolean
          device_info: Json | null
          id: string
          view_duration_seconds: number | null
          viewed_at: string
        }
        Insert: {
          ad_id: string
          agent_id: string
          clicked?: boolean
          completed?: boolean
          device_info?: Json | null
          id?: string
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Update: {
          ad_id?: string
          agent_id?: string
          clicked?: boolean
          completed?: boolean
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
          can_approve_transfers: boolean
          can_delete_agents: boolean
          can_manage_ads: boolean
          can_manage_agents: boolean
          can_manage_announcements: boolean
          can_manage_licenses: boolean
          can_manage_roles: boolean
          can_manage_screens: boolean
          can_manage_units: boolean
          can_view_analytics: boolean
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          can_approve_transfers?: boolean
          can_delete_agents?: boolean
          can_manage_ads?: boolean
          can_manage_agents?: boolean
          can_manage_announcements?: boolean
          can_manage_licenses?: boolean
          can_manage_roles?: boolean
          can_manage_screens?: boolean
          can_manage_units?: boolean
          can_view_analytics?: boolean
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          can_approve_transfers?: boolean
          can_delete_agents?: boolean
          can_manage_ads?: boolean
          can_manage_agents?: boolean
          can_manage_announcements?: boolean
          can_manage_licenses?: boolean
          can_manage_roles?: boolean
          can_manage_screens?: boolean
          can_manage_units?: boolean
          can_view_analytics?: boolean
          created_at?: string
          id?: string
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
        }
        Insert: {
          ad_type?: string
          click_url?: string | null
          content_type?: string
          created_at?: string
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
        }
        Update: {
          ad_type?: string
          click_url?: string | null
          content_type?: string
          created_at?: string
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
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
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
          approval_status: string
          approved_at: string | null
          avatar_url: string | null
          bh_hourly_rate: number | null
          bh_limit: number | null
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
          approval_status?: string
          approved_at?: string | null
          avatar_url?: string | null
          bh_hourly_rate?: number | null
          bh_limit?: number | null
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
          approval_status?: string
          approved_at?: string | null
          avatar_url?: string | null
          bh_hourly_rate?: number | null
          bh_limit?: number | null
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
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          screen_type: string
          show_on_login: boolean | null
          slug: string
          starts_at: string | null
          subtitle: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          screen_type?: string
          show_on_login?: boolean | null
          slug: string
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          screen_type?: string
          show_on_login?: boolean | null
          slug?: string
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      external_database_configs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          supabase_anon_key: string
          supabase_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          supabase_anon_key: string
          supabase_url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          supabase_anon_key?: string
          supabase_url?: string
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
        Relationships: []
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
      patrol_agents: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          is_support: boolean
          position: string | null
          shift_id: string
          status: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          is_support?: boolean
          position?: string | null
          shift_id: string
          status?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          is_support?: boolean
          position?: string | null
          shift_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrol_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_agents_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "patrol_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_events: {
        Row: {
          agent_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          slot_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          slot_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrol_events_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "patrol_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_incidents: {
        Row: {
          agent_id: string | null
          created_at: string
          description: string | null
          id: string
          resolved_at: string | null
          severity: string
          slot_id: string | null
          status: string
          type: string
          unit_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          slot_id?: string | null
          status?: string
          type: string
          unit_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          slot_id?: string | null
          status?: string
          type?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrol_incidents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_incidents_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "patrol_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_incidents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_sectors: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          unit_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          unit_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrol_sectors_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_shifts: {
        Row: {
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          interval_minutes: number
          start_at: string
          status: string
          team: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_at: string
          id?: string
          interval_minutes?: number
          start_at: string
          status?: string
          team: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_at?: string
          id?: string
          interval_minutes?: number
          start_at?: string
          status?: string
          team?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrol_shifts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_slots: {
        Row: {
          agent_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          scheduled_end: string
          scheduled_start: string
          sector_id: string | null
          shift_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paused_at?: string | null
          paused_seconds?: number
          scheduled_end: string
          scheduled_start: string
          sector_id?: string | null
          shift_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paused_at?: string | null
          paused_seconds?: number
          scheduled_end?: string
          scheduled_start?: string
          sector_id?: string | null
          shift_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrol_slots_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_slots_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "patrol_sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_slots_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "patrol_shifts"
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
      quick_round_history: {
        Row: {
          agent_names: string[]
          completed_at: string
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          per_agent_minutes: number
          started_at: string
          team: string | null
          unit_id: string | null
        }
        Insert: {
          agent_names: string[]
          completed_at?: string
          created_at?: string
          created_by?: string | null
          duration_minutes: number
          id?: string
          per_agent_minutes: number
          started_at: string
          team?: string | null
          unit_id?: string | null
        }
        Update: {
          agent_names?: string[]
          completed_at?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          per_agent_minutes?: number
          started_at?: string
          team?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_round_history_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      round_sessions: {
        Row: {
          created_at: string
          end_time: string | null
          ended_at: string | null
          id: string
          interval_min: number | null
          is_active: boolean
          mode: string
          notified_indices: number[] | null
          rows: Json | null
          server_started_at: string
          start_time: string | null
          team: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          ended_at?: string | null
          id?: string
          interval_min?: number | null
          is_active?: boolean
          mode?: string
          notified_indices?: number[] | null
          rows?: Json | null
          server_started_at?: string
          start_time?: string | null
          team: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          ended_at?: string | null
          id?: string
          interval_min?: number | null
          is_active?: boolean
          mode?: string
          notified_indices?: number[] | null
          rows?: Json | null
          server_started_at?: string
          start_time?: string | null
          team?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_credentials: {
        Row: {
          agent_id: string
          browser: string | null
          cpf: string | null
          created_at: string
          device_id: string | null
          device_name: string | null
          encrypted_token: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string | null
          os: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          browser?: string | null
          cpf?: string | null
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          encrypted_token?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string | null
          os?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          browser?: string | null
          cpf?: string | null
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          encrypted_token?: string | null
          id?: string
          is_active?: boolean
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
          id: string
          interval_minutes: number | null
          is_enabled: boolean
          last_triggered_at: string | null
          mode: string
          name: string
          next_trigger_at: string | null
          recur_times: string[] | null
          recur_weekdays: number[] | null
          require_confirmation_to_stop: boolean
          ronda_duration_min: number
          round_end_time: string | null
          round_interval_min: number
          round_mode: string
          round_start_time: string | null
          scheduled_at: string | null
          team: string
          unit_id: string | null
        }
        Insert: {
          active_from?: string | null
          active_until?: string | null
          created_at?: string
          id?: string
          interval_minutes?: number | null
          is_enabled?: boolean
          last_triggered_at?: string | null
          mode?: string
          name: string
          next_trigger_at?: string | null
          recur_times?: string[] | null
          recur_weekdays?: number[] | null
          require_confirmation_to_stop?: boolean
          ronda_duration_min?: number
          round_end_time?: string | null
          round_interval_min?: number
          round_mode?: string
          round_start_time?: string | null
          scheduled_at?: string | null
          team: string
          unit_id?: string | null
        }
        Update: {
          active_from?: string | null
          active_until?: string | null
          created_at?: string
          id?: string
          interval_minutes?: number | null
          is_enabled?: boolean
          last_triggered_at?: string | null
          mode?: string
          name?: string
          next_trigger_at?: string | null
          recur_times?: string[] | null
          recur_weekdays?: number[] | null
          require_confirmation_to_stop?: boolean
          ronda_duration_min?: number
          round_end_time?: string | null
          round_interval_min?: number
          round_mode?: string
          round_start_time?: string | null
          scheduled_at?: string | null
          team?: string
          unit_id?: string | null
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
          agent_id: string | null
          book_entry: string | null
          completed_at: string | null
          created_at: string
          handcuff_keys_counted: number | null
          handcuffs_counted: number | null
          handover_notes: string | null
          handover_ok: boolean
          id: string
          observations: string | null
          radios_charged_count: number | null
          radios_total_expected: number | null
          shift_date: string
          shift_id: string | null
          signature: string | null
          tonfas_counted: number | null
          tonfas_expected: number | null
          unit_id: string | null
        }
        Insert: {
          adolescents_counted?: number | null
          agent_id?: string | null
          book_entry?: string | null
          completed_at?: string | null
          created_at?: string
          handcuff_keys_counted?: number | null
          handcuffs_counted?: number | null
          handover_notes?: string | null
          handover_ok?: boolean
          id?: string
          observations?: string | null
          radios_charged_count?: number | null
          radios_total_expected?: number | null
          shift_date: string
          shift_id?: string | null
          signature?: string | null
          tonfas_counted?: number | null
          tonfas_expected?: number | null
          unit_id?: string | null
        }
        Update: {
          adolescents_counted?: number | null
          agent_id?: string | null
          book_entry?: string | null
          completed_at?: string | null
          created_at?: string
          handcuff_keys_counted?: number | null
          handcuffs_counted?: number | null
          handover_notes?: string | null
          handover_ok?: boolean
          id?: string
          observations?: string | null
          radios_charged_count?: number | null
          radios_total_expected?: number | null
          shift_date?: string
          shift_id?: string | null
          signature?: string | null
          tonfas_counted?: number | null
          tonfas_expected?: number | null
          unit_id?: string | null
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
            foreignKeyName: "shift_briefings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_planner_configs: {
        Row: {
          agent_count: number
          agent_id: string
          config_name: string
          config_type: string
          created_at: string
          end_time: string
          id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          agent_count?: number
          agent_id: string
          config_name: string
          config_type: string
          created_at?: string
          end_time: string
          id?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          agent_count?: number
          agent_id?: string
          config_name?: string
          config_type?: string
          created_at?: string
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_planner_configs_agent_id_fkey"
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
          requester_shift_id: string | null
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
          requester_shift_id?: string | null
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
          requester_shift_id?: string | null
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
            foreignKeyName: "shift_swaps_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "agents"
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
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      team_lock_state: {
        Row: {
          created_at: string
          id: string
          scheduled_for: string | null
          team: string | null
          team_confirmed: boolean
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          scheduled_for?: string | null
          team?: string | null
          team_confirmed?: boolean
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          scheduled_for?: string | null
          team?: string | null
          team_confirmed?: boolean
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_lock_state_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      team_round_log: {
        Row: {
          agents_count: number | null
          completed_at: string
          completed_by: string | null
          id: string
          saved_name: string | null
          team: string
          total_seconds: number | null
          unit_id: string
        }
        Insert: {
          agents_count?: number | null
          completed_at?: string
          completed_by?: string | null
          id?: string
          saved_name?: string | null
          team: string
          total_seconds?: number | null
          unit_id: string
        }
        Update: {
          agents_count?: number | null
          completed_at?: string
          completed_by?: string | null
          id?: string
          saved_name?: string | null
          team?: string
          total_seconds?: number | null
          unit_id?: string
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
          coordinator_name: string | null
          created_at: string
          director_name: string | null
          email: string | null
          id: string
          municipality: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          coordinator_name?: string | null
          created_at?: string
          director_name?: string | null
          email?: string | null
          id?: string
          municipality: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          coordinator_name?: string | null
          created_at?: string
          director_name?: string | null
          email?: string | null
          id?: string
          municipality?: string
          name?: string
          phone?: string | null
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
      cleanup_orphan_auth_user: { Args: { p_email: string }; Returns: boolean }
      close_bh_month: {
        Args: { p_agent_id: string; p_month: number; p_year: number }
        Returns: {
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
          year: number
        }
        SetofOptions: {
          from: "*"
          to: "bh_monthly_cycles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_patrol_slot: {
        Args: { p_slot_id: string }
        Returns: {
          agent_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          scheduled_end: string
          scheduled_start: string
          sector_id: string | null
          shift_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "patrol_slots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_shift_reminder: {
        Args: { p_agent_id: string; p_shift_date: string; p_shift_id?: string }
        Returns: undefined
      }
      extend_license: {
        Args: { p_admin_id: string; p_agent_id: string; p_months: number }
        Returns: string
      }
      extend_patrol_slot: {
        Args: { p_minutes?: number; p_slot_id: string }
        Returns: {
          agent_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          scheduled_end: string
          scheduled_start: string
          sector_id: string | null
          shift_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "patrol_slots"
          isOneToOne: true
          isSetofReturn: false
        }
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
      get_patrol_metrics: {
        Args: { p_shift_id: string }
        Returns: {
          completed_slots: number
          coverage_pct: number
          late_slots: number
          open_incidents: number
          pending_slots: number
          total_slots: number
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
      get_server_now: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_master: { Args: { _user_id: string }; Returns: boolean }
      is_license_expired: { Args: { p_agent_id: string }; Returns: boolean }
      list_units_basic: {
        Args: never
        Returns: {
          id: string
          municipality: string
          name: string
        }[]
      }
      lookup_agent_by_cpf: {
        Args: { _cpf: string }
        Returns: {
          id: string
          is_active: boolean
          is_frozen: boolean
          license_expires_at: string
          license_status: string
          name: string
          team: string
          unit_municipality: string
          unit_name: string
        }[]
      }
      lookup_agent_for_login: {
        Args: { _cpf: string }
        Returns: {
          id: string
          is_active: boolean
          is_frozen: boolean
          license_expires_at: string
          license_status: string
          name: string
          team: string
          unit_municipality: string
          unit_name: string
        }[]
      }
      mark_late_patrol_slots: {
        Args: { p_shift_id: string }
        Returns: {
          agent_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          scheduled_end: string
          scheduled_start: string
          sector_id: string | null
          shift_id: string
          started_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "patrol_slots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pause_patrol_slot: {
        Args: { p_slot_id: string }
        Returns: {
          agent_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          scheduled_end: string
          scheduled_start: string
          sector_id: string | null
          shift_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "patrol_slots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_login_attempt: {
        Args: { p_identifier: string; p_ip?: string; p_success: boolean }
        Returns: undefined
      }
      resume_patrol_slot: {
        Args: { p_slot_id: string }
        Returns: {
          agent_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          scheduled_end: string
          scheduled_start: string
          sector_id: string | null
          shift_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "patrol_slots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_patrol_slot: {
        Args: { p_slot_id: string }
        Returns: {
          agent_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          scheduled_end: string
          scheduled_start: string
          sector_id: string | null
          shift_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "patrol_slots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_offline_license_cache: {
        Args: never
        Returns: {
          agent_id: string
          cpf: string
          is_active: boolean
          is_frozen: boolean
          license_expires_at: string
          license_status: string
        }[]
      }
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
      app_role: "admin" | "user" | "master"
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
      app_role: ["admin", "user", "master"],
    },
  },
} as const
