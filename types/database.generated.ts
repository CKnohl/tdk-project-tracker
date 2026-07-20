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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: Database["public"]["Enums"]["activity_action"]
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["activity_entity"]
          id: string
          metadata: Json
          project_id: string | null
          summary: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["activity_action"]
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: Database["public"]["Enums"]["activity_entity"]
          id?: string
          metadata?: Json
          project_id?: string | null
          summary?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["activity_action"]
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["activity_entity"]
          id?: string
          metadata?: Json
          project_id?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          id: string
          project_id: string | null
          start_at: string
          submittal_id: string | null
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          id?: string
          project_id?: string | null
          start_at: string
          submittal_id?: string | null
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          id?: string
          project_id?: string | null
          start_at?: string
          submittal_id?: string | null
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "calendar_events_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "project_submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          color: string | null
          created_at: string
          domain: string
          id: number
          key: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          domain: string
          id?: never
          key: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          domain?: string
          id?: never
          key?: string
          name?: string
        }
        Relationships: []
      }
      intake_documents: {
        Row: {
          created_at: string
          file_name: string
          filed_at: string | null
          filed_by: string | null
          filed_project_id: string | null
          id: string
          mime_type: string | null
          note: string | null
          size_bytes: number | null
          source_type: string
          status: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          filed_at?: string | null
          filed_by?: string | null
          filed_project_id?: string | null
          id?: string
          mime_type?: string | null
          note?: string | null
          size_bytes?: number | null
          source_type?: string
          status?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          filed_at?: string | null
          filed_by?: string | null
          filed_project_id?: string | null
          id?: string
          mime_type?: string | null
          note?: string | null
          size_bytes?: number | null
          source_type?: string
          status?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_documents_filed_by_fkey"
            columns: ["filed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_documents_filed_project_id_fkey"
            columns: ["filed_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_documents_filed_project_id_fkey"
            columns: ["filed_project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_documents_filed_project_id_fkey"
            columns: ["filed_project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_documents_filed_project_id_fkey"
            columns: ["filed_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "intake_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_proposals: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          applied_entity_id: string | null
          applied_entity_type: string | null
          category: string | null
          comment: string | null
          confidence: number
          created_at: string
          created_by: string | null
          dedupe_key: string | null
          fields: Json
          id: string
          intake_document_id: string
          matched_project_id: string | null
          project_match: string | null
          proposal_type: string
          reasoning: string | null
          source_text: string | null
          state: string
          suggested_assignee: string | null
          suggested_due_date: string | null
          suggested_project_ref: string | null
          title: string
          uncertainties: string | null
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          applied_entity_id?: string | null
          applied_entity_type?: string | null
          category?: string | null
          comment?: string | null
          confidence?: number
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          fields?: Json
          id?: string
          intake_document_id: string
          matched_project_id?: string | null
          project_match?: string | null
          proposal_type: string
          reasoning?: string | null
          source_text?: string | null
          state?: string
          suggested_assignee?: string | null
          suggested_due_date?: string | null
          suggested_project_ref?: string | null
          title: string
          uncertainties?: string | null
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          applied_entity_id?: string | null
          applied_entity_type?: string | null
          category?: string | null
          comment?: string | null
          confidence?: number
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          fields?: Json
          id?: string
          intake_document_id?: string
          matched_project_id?: string | null
          project_match?: string | null
          proposal_type?: string
          reasoning?: string | null
          source_text?: string | null
          state?: string
          suggested_assignee?: string | null
          suggested_due_date?: string | null
          suggested_project_ref?: string | null
          title?: string
          uncertainties?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_proposals_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_proposals_intake_document_id_fkey"
            columns: ["intake_document_id"]
            isOneToOne: false
            referencedRelation: "intake_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_proposals_matched_project_id_fkey"
            columns: ["matched_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_proposals_matched_project_id_fkey"
            columns: ["matched_project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_proposals_matched_project_id_fkey"
            columns: ["matched_project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_proposals_matched_project_id_fkey"
            columns: ["matched_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_deadline_changed: boolean
          email_enabled: boolean
          email_project_assigned: boolean
          email_task_assigned: boolean
          email_task_completed: boolean
          inapp_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_deadline_changed?: boolean
          email_enabled?: boolean
          email_project_assigned?: boolean
          email_task_assigned?: boolean
          email_task_completed?: boolean
          inapp_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_deadline_changed?: boolean
          email_enabled?: boolean
          email_project_assigned?: boolean
          email_task_assigned?: boolean
          email_task_completed?: boolean
          inapp_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["activity_entity"] | null
          id: string
          is_read: boolean
          project_id: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["activity_entity"] | null
          id?: string
          is_read?: boolean
          project_id?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["activity_entity"] | null
          id?: string
          is_read?: boolean
          project_id?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contacts: {
        Row: {
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          project_id: string
          role: Database["public"]["Enums"]["contact_role"]
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          project_id: string
          role?: Database["public"]["Enums"]["contact_role"]
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          project_id?: string
          role?: Database["public"]["Enums"]["contact_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          project_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          project_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          project_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_leads: {
        Row: {
          assigned_at: string
          project_id: string
          staff_id: string
        }
        Insert: {
          assigned_at?: string
          project_id: string
          staff_id: string
        }
        Update: {
          assigned_at?: string
          project_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_leads_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_leads_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "v_staff_workload"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      project_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_phases: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          name: string
          position: number
          progress: number
          project_id: string
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          name: string
          position?: number
          progress?: number
          project_id: string
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          name?: string
          position?: number
          progress?: number
          project_id?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_staff: {
        Row: {
          assigned_at: string
          project_id: string
          role_on_project: string | null
          staff_id: string
        }
        Insert: {
          assigned_at?: string
          project_id: string
          role_on_project?: string | null
          staff_id: string
        }
        Update: {
          assigned_at?: string
          project_id?: string
          role_on_project?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_staff_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_staff_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_staff_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_staff_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "v_staff_workload"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      project_submittals: {
        Row: {
          agency: string | null
          assigned_staff_id: string | null
          created_at: string
          created_by: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          project_id: string
          response_due_date: string | null
          status: Database["public"]["Enums"]["submittal_status"]
          submission_date: string | null
          submission_type: string
          updated_at: string
        }
        Insert: {
          agency?: string | null
          assigned_staff_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          project_id: string
          response_due_date?: string | null
          status?: Database["public"]["Enums"]["submittal_status"]
          submission_date?: string | null
          submission_type: string
          updated_at?: string
        }
        Update: {
          agency?: string | null
          assigned_staff_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          response_due_date?: string | null
          status?: Database["public"]["Enums"]["submittal_status"]
          submission_date?: string | null
          submission_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_submittals_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "v_staff_workload"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "project_submittals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      projects: {
        Row: {
          company_id: number
          created_at: string
          created_by: string | null
          current_phase_name: string | null
          description: string | null
          id: string
          inactive_reason: Database["public"]["Enums"]["inactive_reason"] | null
          last_activity_at: string
          name: string
          phase: Database["public"]["Enums"]["project_phase"]
          project_manager_id: string | null
          project_number: string
          scope: string | null
          status: Database["public"]["Enums"]["project_status"]
          target_completion_date: string | null
          updated_at: string
          workflow_state: Database["public"]["Enums"]["workflow_state"]
          workflow_state_since: string | null
        }
        Insert: {
          company_id: number
          created_at?: string
          created_by?: string | null
          current_phase_name?: string | null
          description?: string | null
          id?: string
          inactive_reason?:
            | Database["public"]["Enums"]["inactive_reason"]
            | null
          last_activity_at?: string
          name: string
          phase?: Database["public"]["Enums"]["project_phase"]
          project_manager_id?: string | null
          project_number: string
          scope?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_completion_date?: string | null
          updated_at?: string
          workflow_state?: Database["public"]["Enums"]["workflow_state"]
          workflow_state_since?: string | null
        }
        Update: {
          company_id?: number
          created_at?: string
          created_by?: string | null
          current_phase_name?: string | null
          description?: string | null
          id?: string
          inactive_reason?:
            | Database["public"]["Enums"]["inactive_reason"]
            | null
          last_activity_at?: string
          name?: string
          phase?: Database["public"]["Enums"]["project_phase"]
          project_manager_id?: string | null
          project_number?: string
          scope?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_completion_date?: string | null
          updated_at?: string
          workflow_state?: Database["public"]["Enums"]["workflow_state"]
          workflow_state_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "v_staff_workload"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      report_runs: {
        Row: {
          created_at: string
          generated_at: string
          generated_by: string | null
          id: string
          pdf_path: string | null
          report_type: string
          snapshot: Json
          subject_staff_id: string | null
          summary: string | null
        }
        Insert: {
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          pdf_path?: string | null
          report_type?: string
          snapshot?: Json
          subject_staff_id?: string | null
          summary?: string | null
        }
        Update: {
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          pdf_path?: string | null
          report_type?: string
          snapshot?: Json
          subject_staff_id?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_runs_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_subject_staff_id_fkey"
            columns: ["subject_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_subject_staff_id_fkey"
            columns: ["subject_staff_id"]
            isOneToOne: false
            referencedRelation: "v_staff_workload"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          id: number
          key: string
          name: string
          rank: number
        }
        Insert: {
          description?: string | null
          id?: never
          key: string
          name: string
          rank: number
        }
        Update: {
          description?: string | null
          id?: never
          key?: string
          name?: string
          rank?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          scope: string
          updated_at: string
          user_id: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          scope: string
          updated_at?: string
          user_id?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          scope?: string
          updated_at?: string
          user_id?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          company_id: number | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string
          id: string
          initials: string | null
          is_active: boolean
          last_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          initials?: string | null
          is_active?: boolean
          last_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: number | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          initials?: string | null
          is_active?: boolean
          last_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["submittal_status"] | null
          id: string
          note: string | null
          submittal_id: string
          to_status: Database["public"]["Enums"]["submittal_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["submittal_status"] | null
          id?: string
          note?: string | null
          submittal_id: string
          to_status: Database["public"]["Enums"]["submittal_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["submittal_status"] | null
          id?: string
          note?: string | null
          submittal_id?: string
          to_status?: Database["public"]["Enums"]["submittal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "submittal_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_history_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "project_submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reviews: {
        Row: {
          action: string
          actor_id: string | null
          comment: string | null
          created_at: string
          id: string
          prior_status: Database["public"]["Enums"]["task_status"] | null
          task_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          prior_status?: Database["public"]["Enums"]["task_status"] | null
          task_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          prior_status?: Database["public"]["Enums"]["task_status"] | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reviews_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_reviews_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_staff_workload"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "task_reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_staff: {
        Row: {
          staff_id: string
          task_id: string
        }
        Insert: {
          staff_id: string
          task_id: string
        }
        Update: {
          staff_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "v_staff_workload"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "task_staff_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          completion_pct: number
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          notes: string | null
          prior_status: Database["public"]["Enums"]["task_status"] | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          recurrence: Database["public"]["Enums"]["task_recurrence"]
          review_requested_at: string | null
          review_requested_by: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completion_pct?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          notes?: string | null
          prior_status?: Database["public"]["Enums"]["task_status"] | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence?: Database["public"]["Enums"]["task_recurrence"]
          review_requested_at?: string | null
          review_requested_by?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completion_pct?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          prior_status?: Database["public"]["Enums"]["task_status"] | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence?: Database["public"]["Enums"]["task_recurrence"]
          review_requested_at?: string | null
          review_requested_by?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_awaiting_response_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_follow_up_needed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tasks_review_requested_by_fkey"
            columns: ["review_requested_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_review_requested_by_fkey"
            columns: ["review_requested_by"]
            isOneToOne: false
            referencedRelation: "v_staff_workload"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          company_id: number | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          role_id: number
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: number | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          role_id: number
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: number | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role_id?: number
          staff_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "v_staff_workload"
            referencedColumns: ["staff_id"]
          },
        ]
      }
    }
    Views: {
      v_awaiting_response_projects: {
        Row: {
          company_id: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          inactive_reason: Database["public"]["Enums"]["inactive_reason"] | null
          last_activity_at: string | null
          name: string | null
          phase: Database["public"]["Enums"]["project_phase"] | null
          project_manager_id: string | null
          project_number: string | null
          scope: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          target_completion_date: string | null
          updated_at: string | null
          workflow_state: Database["public"]["Enums"]["workflow_state"] | null
          workflow_state_since: string | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          inactive_reason?:
            | Database["public"]["Enums"]["inactive_reason"]
            | null
          last_activity_at?: string | null
          name?: string | null
          phase?: Database["public"]["Enums"]["project_phase"] | null
          project_manager_id?: string | null
          project_number?: string | null
          scope?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          target_completion_date?: string | null
          updated_at?: string | null
          workflow_state?: Database["public"]["Enums"]["workflow_state"] | null
          workflow_state_since?: string | null
        }
        Update: {
          company_id?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          inactive_reason?:
            | Database["public"]["Enums"]["inactive_reason"]
            | null
          last_activity_at?: string | null
          name?: string | null
          phase?: Database["public"]["Enums"]["project_phase"] | null
          project_manager_id?: string | null
          project_number?: string | null
          scope?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          target_completion_date?: string | null
          updated_at?: string | null
          workflow_state?: Database["public"]["Enums"]["workflow_state"] | null
          workflow_state_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "v_staff_workload"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      v_calendar_feed: {
        Row: {
          all_day: boolean | null
          end_at: string | null
          entity_id: string | null
          event_type: Database["public"]["Enums"]["calendar_event_type"] | null
          feed_id: string | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
          source: string | null
          start_at: string | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
      v_follow_up_needed: {
        Row: {
          company_id: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          inactive_reason: Database["public"]["Enums"]["inactive_reason"] | null
          last_activity_at: string | null
          name: string | null
          phase: Database["public"]["Enums"]["project_phase"] | null
          project_manager_id: string | null
          project_number: string | null
          reason: string | null
          scope: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          target_completion_date: string | null
          updated_at: string | null
          workflow_state: Database["public"]["Enums"]["workflow_state"] | null
          workflow_state_since: string | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          inactive_reason?:
            | Database["public"]["Enums"]["inactive_reason"]
            | null
          last_activity_at?: string | null
          name?: string | null
          phase?: Database["public"]["Enums"]["project_phase"] | null
          project_manager_id?: string | null
          project_number?: string | null
          reason?: never
          scope?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          target_completion_date?: string | null
          updated_at?: string | null
          workflow_state?: Database["public"]["Enums"]["workflow_state"] | null
          workflow_state_since?: string | null
        }
        Update: {
          company_id?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          inactive_reason?:
            | Database["public"]["Enums"]["inactive_reason"]
            | null
          last_activity_at?: string | null
          name?: string | null
          phase?: Database["public"]["Enums"]["project_phase"] | null
          project_manager_id?: string | null
          project_number?: string | null
          reason?: never
          scope?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          target_completion_date?: string | null
          updated_at?: string | null
          workflow_state?: Database["public"]["Enums"]["workflow_state"] | null
          workflow_state_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "v_staff_workload"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      v_project_stats: {
        Row: {
          awaiting_submittals: number | null
          next_due_date: string | null
          open_tasks: number | null
          overdue_tasks: number | null
          project_id: string | null
          team_size: number | null
        }
        Relationships: []
      }
      v_staff_workload: {
        Row: {
          active_projects: number | null
          full_name: string | null
          initials: string | null
          open_tasks: number | null
          staff_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_role_rank: { Args: never; Returns: number }
      can_manage_project: { Args: { p: string }; Returns: boolean }
      create_notification: {
        Args: {
          p_body?: string
          p_entity_id?: string
          p_entity_type?: Database["public"]["Enums"]["activity_entity"]
          p_project_id?: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user: string
        }
        Returns: string
      }
      current_staff_id: { Args: never; Returns: string }
      has_min_rank:
        | {
            Args: { min_rank: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.has_min_rank(min_rank => int2), public.has_min_rank(min_rank => int4). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { min_rank: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.has_min_rank(min_rank => int2), public.has_min_rank(min_rank => int4). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      is_admin: { Args: never; Returns: boolean }
      is_project_lead: { Args: { p: string }; Returns: boolean }
      is_project_member: { Args: { p: string }; Returns: boolean }
      transfer_staff_ownership: {
        Args: { p_from: string; p_to: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_action:
        | "created"
        | "updated"
        | "deleted"
        | "status_changed"
        | "assigned"
        | "unassigned"
        | "restored"
        | "commented"
      activity_entity:
        | "project"
        | "task"
        | "submittal"
        | "file"
        | "note"
        | "contact"
        | "status"
      calendar_event_type:
        | "deadline"
        | "meeting"
        | "submittal"
        | "site_visit"
        | "follow_up"
        | "milestone"
        | "custom"
        | "presentation"
        | "town_meeting"
        | "inspection"
      contact_role:
        | "client"
        | "attorney"
        | "contractor"
        | "surveyor"
        | "planner"
        | "municipal_reviewer"
        | "architect"
        | "engineer"
        | "inspector"
        | "other"
      inactive_reason: "completed" | "lost_bid" | "cancelled" | "fell_through"
      notification_type:
        | "task_due_tomorrow"
        | "task_overdue"
        | "submittal_awaiting_too_long"
        | "project_assigned"
        | "task_assigned"
        | "project_updated"
        | "follow_up_due"
        | "task_completed"
        | "deadline_changed"
        | "review_requested"
        | "task_approved"
        | "task_rejected"
      project_phase:
        | "proposal"
        | "survey"
        | "existing_conditions"
        | "concept_design"
        | "engineering_design"
        | "client_review"
        | "municipal_review"
        | "permitting"
        | "bidding"
        | "construction"
        | "closeout"
        | "completed"
      project_status: "active" | "on_hold" | "inactive"
      submittal_status:
        | "drafting"
        | "ready_to_submit"
        | "submitted"
        | "awaiting_response"
        | "revision_required"
        | "approved"
        | "rejected"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_recurrence: "none" | "daily" | "weekly" | "monthly" | "yearly"
      task_status:
        | "not_started"
        | "in_progress"
        | "waiting"
        | "completed"
        | "cancelled"
        | "in_review"
      workflow_state:
        | "normal"
        | "awaiting_response"
        | "needs_follow_up"
        | "urgent_follow_up"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_action: [
        "created",
        "updated",
        "deleted",
        "status_changed",
        "assigned",
        "unassigned",
        "restored",
        "commented",
      ],
      activity_entity: [
        "project",
        "task",
        "submittal",
        "file",
        "note",
        "contact",
        "status",
      ],
      calendar_event_type: [
        "deadline",
        "meeting",
        "submittal",
        "site_visit",
        "follow_up",
        "milestone",
        "custom",
        "presentation",
        "town_meeting",
        "inspection",
      ],
      contact_role: [
        "client",
        "attorney",
        "contractor",
        "surveyor",
        "planner",
        "municipal_reviewer",
        "architect",
        "engineer",
        "inspector",
        "other",
      ],
      inactive_reason: ["completed", "lost_bid", "cancelled", "fell_through"],
      notification_type: [
        "task_due_tomorrow",
        "task_overdue",
        "submittal_awaiting_too_long",
        "project_assigned",
        "task_assigned",
        "project_updated",
        "follow_up_due",
        "task_completed",
        "deadline_changed",
        "review_requested",
        "task_approved",
        "task_rejected",
      ],
      project_phase: [
        "proposal",
        "survey",
        "existing_conditions",
        "concept_design",
        "engineering_design",
        "client_review",
        "municipal_review",
        "permitting",
        "bidding",
        "construction",
        "closeout",
        "completed",
      ],
      project_status: ["active", "on_hold", "inactive"],
      submittal_status: [
        "drafting",
        "ready_to_submit",
        "submitted",
        "awaiting_response",
        "revision_required",
        "approved",
        "rejected",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_recurrence: ["none", "daily", "weekly", "monthly", "yearly"],
      task_status: [
        "not_started",
        "in_progress",
        "waiting",
        "completed",
        "cancelled",
        "in_review",
      ],
      workflow_state: [
        "normal",
        "awaiting_response",
        "needs_follow_up",
        "urgent_follow_up",
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
