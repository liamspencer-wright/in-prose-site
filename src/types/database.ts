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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string | null
          book_isbn13: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          activity_type?: string | null
          book_isbn13?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string | null
          book_isbn13?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_book_isbn13_fkey"
            columns: ["book_isbn13"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "activities_book_isbn13_fkey"
            columns: ["book_isbn13"]
            isOneToOne: false
            referencedRelation: "books_expanded"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          emoji: string
          id: string
          reactor_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          emoji: string
          id?: string
          reactor_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          emoji?: string
          id?: string
          reactor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "activity_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_comments: {
        Row: {
          activity_type: string
          activity_user_id: string
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          id: string
          isbn13: string
          mentions: string[]
          parent_id: string | null
          tagged_books: string[]
        }
        Insert: {
          activity_type: string
          activity_user_id: string
          author_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          isbn13: string
          mentions?: string[]
          parent_id?: string | null
          tagged_books?: string[]
        }
        Update: {
          activity_type?: string
          activity_user_id?: string
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          isbn13?: string
          mentions?: string[]
          parent_id?: string | null
          tagged_books?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "activity_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "activity_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_reactions: {
        Row: {
          activity_type: string
          activity_user_id: string
          created_at: string
          emoji: string
          id: string
          isbn13: string
          reactor_id: string
        }
        Insert: {
          activity_type: string
          activity_user_id: string
          created_at?: string
          emoji: string
          id?: string
          isbn13: string
          reactor_id: string
        }
        Update: {
          activity_type?: string
          activity_user_id?: string
          created_at?: string
          emoji?: string
          id?: string
          isbn13?: string
          reactor_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          action: string
          book_isbn13: string | null
          created_at: string
          event_type: string
          follow_up_action: string | null
          friend_user_id: string | null
          id: string
          metadata: Json | null
          query_length: number | null
          rating: number | null
          result_count: number | null
          review_length: number | null
          screen_name: string | null
          session_id: string | null
          source: string | null
          source_screen: string | null
          user_id: string
        }
        Insert: {
          action: string
          book_isbn13?: string | null
          created_at?: string
          event_type: string
          follow_up_action?: string | null
          friend_user_id?: string | null
          id?: string
          metadata?: Json | null
          query_length?: number | null
          rating?: number | null
          result_count?: number | null
          review_length?: number | null
          screen_name?: string | null
          session_id?: string | null
          source?: string | null
          source_screen?: string | null
          user_id: string
        }
        Update: {
          action?: string
          book_isbn13?: string | null
          created_at?: string
          event_type?: string
          follow_up_action?: string | null
          friend_user_id?: string | null
          id?: string
          metadata?: Json | null
          query_length?: number | null
          rating?: number | null
          result_count?: number | null
          review_length?: number | null
          screen_name?: string | null
          session_id?: string | null
          source?: string | null
          source_screen?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          app_version: string | null
          build_environment: string | null
          created_at: string
          device_type: string | null
          ended_at: string | null
          id: string
          os_version: string | null
          platform: string | null
          session_length_seconds: number | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          build_environment?: string | null
          created_at?: string
          device_type?: string | null
          ended_at?: string | null
          id?: string
          os_version?: string | null
          platform?: string | null
          session_length_seconds?: number | null
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          build_environment?: string | null
          created_at?: string
          device_type?: string | null
          ended_at?: string | null
          id?: string
          os_version?: string | null
          platform?: string | null
          session_length_seconds?: number | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          id: number
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          id?: number
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      authors: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      book_authors: {
        Row: {
          author_id: string
          isbn13: string
          ord: number
        }
        Insert: {
          author_id: string
          isbn13: string
          ord?: number
        }
        Update: {
          author_id?: string
          isbn13?: string
          ord?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_authors_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_authors_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "book_authors_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books_expanded"
            referencedColumns: ["isbn13"]
          },
        ]
      }
      book_groups: {
        Row: {
          canonical_author: string
          canonical_title: string
          created_at: string
          id: string
        }
        Insert: {
          canonical_author: string
          canonical_title: string
          created_at?: string
          id?: string
        }
        Update: {
          canonical_author?: string
          canonical_title?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      book_isbn_groups: {
        Row: {
          created_at: string
          group_id: string
          isbn13: string
        }
        Insert: {
          created_at?: string
          group_id: string
          isbn13: string
        }
        Update: {
          created_at?: string
          group_id?: string
          isbn13?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_isbn_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "book_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_isbn_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["book_group_id"]
          },
          {
            foreignKeyName: "book_isbn_groups_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "book_isbn_groups_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: true
            referencedRelation: "books_expanded"
            referencedColumns: ["isbn13"]
          },
        ]
      }
      book_lookup_failures: {
        Row: {
          failed_at: string
          isbn13: string
          retry_after: string
        }
        Insert: {
          failed_at?: string
          isbn13: string
          retry_after?: string
        }
        Update: {
          failed_at?: string
          isbn13?: string
          retry_after?: string
        }
        Relationships: []
      }
      book_popularity_stats: {
        Row: {
          finished_users: number
          isbn13: string
          users_with_book: number
        }
        Insert: {
          finished_users?: number
          isbn13: string
          users_with_book?: number
        }
        Update: {
          finished_users?: number
          isbn13?: string
          users_with_book?: number
        }
        Relationships: []
      }
      book_rating_stats: {
        Row: {
          avg_rating: number | null
          isbn13: string
          ratings_count: number
        }
        Insert: {
          avg_rating?: number | null
          isbn13: string
          ratings_count?: number
        }
        Update: {
          avg_rating?: number | null
          isbn13?: string
          ratings_count?: number
        }
        Relationships: []
      }
      book_recommendations: {
        Row: {
          created_at: string
          id: string
          isbn13: string
          message: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          isbn13: string
          message?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          isbn13?: string
          message?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_recommendations_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "book_recommendations_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books_expanded"
            referencedColumns: ["isbn13"]
          },
        ]
      }
      book_subjects: {
        Row: {
          created_at: string | null
          isbn13: string
          subject_id: number
        }
        Insert: {
          created_at?: string | null
          isbn13: string
          subject_id: number
        }
        Update: {
          created_at?: string | null
          isbn13?: string
          subject_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_subjects_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "book_subjects_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books_expanded"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "book_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          binding: string | null
          created_at: string | null
          date_published: string | null
          image: string | null
          image_original: string | null
          isbn10: string | null
          isbn13: string
          language: string | null
          msrp: number | null
          pages: number | null
          publisher: string | null
          series_name_raw: string | null
          series_position_raw: number | null
          subtitle: string | null
          synopsis: string | null
          title: string | null
          title_long: string | null
          updated_at: string | null
        }
        Insert: {
          binding?: string | null
          created_at?: string | null
          date_published?: string | null
          image?: string | null
          image_original?: string | null
          isbn10?: string | null
          isbn13: string
          language?: string | null
          msrp?: number | null
          pages?: number | null
          publisher?: string | null
          series_name_raw?: string | null
          series_position_raw?: number | null
          subtitle?: string | null
          synopsis?: string | null
          title?: string | null
          title_long?: string | null
          updated_at?: string | null
        }
        Update: {
          binding?: string | null
          created_at?: string | null
          date_published?: string | null
          image?: string | null
          image_original?: string | null
          isbn10?: string | null
          isbn13?: string
          language?: string | null
          msrp?: number | null
          pages?: number | null
          publisher?: string | null
          series_name_raw?: string | null
          series_position_raw?: number | null
          subtitle?: string | null
          synopsis?: string | null
          title?: string | null
          title_long?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      campaign_deliveries: {
        Row: {
          campaign_id: string
          created_at: string
          device_token: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          device_token: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          device_token?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_deliveries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "push_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      community_recommendation: {
        Row: {
          active: boolean
          description: string | null
          id: string
          isbn: string
          recommender_image_url: string | null
          recommender_name: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          description?: string | null
          id?: string
          isbn: string
          recommender_image_url?: string | null
          recommender_name?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          description?: string | null
          id?: string
          isbn?: string
          recommender_image_url?: string | null
          recommender_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      content_hidden_for_user: {
        Row: {
          content_id: string
          content_type: Database["public"]["Enums"]["report_content_type"]
          created_at: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: Database["public"]["Enums"]["report_content_type"]
          created_at?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: Database["public"]["Enums"]["report_content_type"]
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: Database["public"]["Enums"]["report_content_type"]
          created_at: string
          id: string
          notes: string | null
          reason: Database["public"]["Enums"]["report_reason_t"]
          reporter_id: string
        }
        Insert: {
          content_id: string
          content_type: Database["public"]["Enums"]["report_content_type"]
          created_at?: string
          id?: string
          notes?: string | null
          reason: Database["public"]["Enums"]["report_reason_t"]
          reporter_id: string
        }
        Update: {
          content_id?: string
          content_type?: Database["public"]["Enums"]["report_content_type"]
          created_at?: string
          id?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["report_reason_t"]
          reporter_id?: string
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          completed_at: string | null
          display_name: string | null
          id: string
          requested_at: string
          status: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          display_name?: string | null
          id?: string
          requested_at?: string
          status?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          display_name?: string | null
          id?: string
          requested_at?: string
          status?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string | null
          environment: string
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          environment: string
          id?: string
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          environment?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      enrichment_response_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          isbn13: string
          question_key: string
          template_version_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          isbn13: string
          question_key: string
          template_version_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          isbn13?: string
          question_key?: string
          template_version_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_response_events_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "survey_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_responses: {
        Row: {
          answers: Json
          answers_custom: Json
          cards_answered: number
          cards_shown: number
          cards_skipped: number
          completed_at: string | null
          created_at: string
          id: string
          isbn13: string
          template_version_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          answers_custom?: Json
          cards_answered?: number
          cards_shown?: number
          cards_skipped?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          isbn13: string
          template_version_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          answers_custom?: Json
          cards_answered?: number
          cards_shown?: number
          cards_skipped?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          isbn13?: string
          template_version_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_responses_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "survey_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_invites: {
        Row: {
          created_at: string | null
          inviter_id: string | null
          status: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          inviter_id?: string | null
          status?: string | null
          token?: string
        }
        Update: {
          created_at?: string | null
          inviter_id?: string | null
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string | null
          created_at: string | null
          id: string
          requester_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          addressee_id?: string | null
          created_at?: string | null
          id?: string
          requester_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          addressee_id?: string | null
          created_at?: string | null
          id?: string
          requester_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          completed: boolean
          created_at: string
          habit_id: string
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          habit_id: string
          id?: string
          log_date: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          habit_id?: string
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          cadence: string
          created_at: string
          display_cadence: string
          end_date: string | null
          habit_type: string
          id: string
          is_active: boolean
          is_home_featured: boolean
          name: string
          reminder_enabled: boolean
          reminder_time: string | null
          show_on_homepage: boolean
          sort_order: number
          start_date: string
          streak_mode: string
          user_id: string
        }
        Insert: {
          cadence?: string
          created_at?: string
          display_cadence?: string
          end_date?: string | null
          habit_type: string
          id?: string
          is_active?: boolean
          is_home_featured?: boolean
          name: string
          reminder_enabled?: boolean
          reminder_time?: string | null
          show_on_homepage?: boolean
          sort_order?: number
          start_date?: string
          streak_mode?: string
          user_id: string
        }
        Update: {
          cadence?: string
          created_at?: string
          display_cadence?: string
          end_date?: string | null
          habit_type?: string
          id?: string
          is_active?: boolean
          is_home_featured?: boolean
          name?: string
          reminder_enabled?: boolean
          reminder_time?: string | null
          show_on_homepage?: boolean
          sort_order?: number
          start_date?: string
          streak_mode?: string
          user_id?: string
        }
        Relationships: []
      }
      link_clicks: {
        Row: {
          clicked_at: string
          id: string
          ip_hash: string | null
          referrer: string | null
          share_link_id: string
          user_agent: string | null
          user_id: string | null
          visitor_fingerprint: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          share_link_id: string
          user_agent?: string | null
          user_id?: string | null
          visitor_fingerprint?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          share_link_id?: string
          user_agent?: string | null
          user_id?: string | null
          visitor_fingerprint?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_share_link_id_fkey"
            columns: ["share_link_id"]
            isOneToOne: false
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          author_id: string | null
          body: string
          book_list_entries: Json | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          image_urls: string[]
          published_at: string | null
          slug: string
          spotlight_book_group_id: string | null
          status: Database["public"]["Enums"]["news_post_status_t"]
          title: string
          type: Database["public"]["Enums"]["news_post_type_t"]
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body?: string
          book_list_entries?: Json | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_urls?: string[]
          published_at?: string | null
          slug: string
          spotlight_book_group_id?: string | null
          status?: Database["public"]["Enums"]["news_post_status_t"]
          title: string
          type: Database["public"]["Enums"]["news_post_type_t"]
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          book_list_entries?: Json | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_urls?: string[]
          published_at?: string | null
          slug?: string
          spotlight_book_group_id?: string | null
          status?: Database["public"]["Enums"]["news_post_status_t"]
          title?: string
          type?: Database["public"]["Enums"]["news_post_type_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_posts_spotlight_book_group_id_fkey"
            columns: ["spotlight_book_group_id"]
            isOneToOne: false
            referencedRelation: "book_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_posts_spotlight_book_group_id_fkey"
            columns: ["spotlight_book_group_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["book_group_id"]
          },
        ]
      }
      notification_consent_log: {
        Row: {
          consent_given: boolean
          created_at: string
          id: string
          prompt_context: string
          user_id: string
        }
        Insert: {
          consent_given: boolean
          created_at?: string
          id?: string
          prompt_context: string
          user_id: string
        }
        Update: {
          consent_given?: boolean
          created_at?: string
          id?: string
          prompt_context?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_outbox: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          recipient_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          recipient_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          recipient_user_id?: string
          status?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          comment_reactions: boolean
          comment_replies: boolean
          comments: boolean
          friend_activity: boolean
          library_adds: boolean
          mentions: boolean
          post_reactions: boolean
          recommendation_responses: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_reactions?: boolean
          comment_replies?: boolean
          comments?: boolean
          friend_activity?: boolean
          library_adds?: boolean
          mentions?: boolean
          post_reactions?: boolean
          recommendation_responses?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_reactions?: boolean
          comment_replies?: boolean
          comments?: boolean
          friend_activity?: boolean
          library_adds?: boolean
          mentions?: boolean
          post_reactions?: boolean
          recommendation_responses?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          read_at: string | null
          reference_id: string | null
          reference_meta: Json | null
          target_user_id: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          reference_id?: string | null
          reference_meta?: Json | null
          target_user_id: string
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          reference_id?: string | null
          reference_meta?: Json | null
          target_user_id?: string
          type?: string
        }
        Relationships: []
      }
      onboarding_responses: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          dismissed_at: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          created_at: string
          edited_at: string | null
          id: string
          image_urls: string[]
          mentions: string[]
          quoted_activity_isbn13: string | null
          quoted_activity_type: string | null
          quoted_activity_user_id: string | null
          tagged_books: string[]
          text_content: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          edited_at?: string | null
          id?: string
          image_urls?: string[]
          mentions?: string[]
          quoted_activity_isbn13?: string | null
          quoted_activity_type?: string | null
          quoted_activity_user_id?: string | null
          tagged_books?: string[]
          text_content: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          edited_at?: string | null
          id?: string
          image_urls?: string[]
          mentions?: string[]
          quoted_activity_isbn13?: string | null
          quoted_activity_type?: string | null
          quoted_activity_user_id?: string | null
          tagged_books?: string[]
          text_content?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badge_type: string | null
          created_at: string
          description: string | null
          display_name: string | null
          id: string
          is_admin: boolean
          is_test_user: boolean
          joined_at: string
          last_active_at: string | null
          last_app_version: string | null
          phone_number: string | null
          updated_at: string
          username: string | null
          username_updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          badge_type?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          id: string
          is_admin?: boolean
          is_test_user?: boolean
          joined_at?: string
          last_active_at?: string | null
          last_app_version?: string | null
          phone_number?: string | null
          updated_at?: string
          username?: string | null
          username_updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          badge_type?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          is_admin?: boolean
          is_test_user?: boolean
          joined_at?: string
          last_active_at?: string | null
          last_app_version?: string | null
          phone_number?: string | null
          updated_at?: string
          username?: string | null
          username_updated_at?: string | null
        }
        Relationships: []
      }
      push_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          message_body: string
          message_title: string
          payload: Json | null
          started_at: string | null
          status: string
          target_audience: string
          title: string
          total_failed: number | null
          total_sent: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          message_body: string
          message_title: string
          payload?: Json | null
          started_at?: string | null
          status?: string
          target_audience?: string
          title: string
          total_failed?: number | null
          total_sent?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          message_body?: string
          message_title?: string
          payload?: Json | null
          started_at?: string | null
          status?: string
          target_audience?: string
          title?: string
          total_failed?: number | null
          total_sent?: number | null
        }
        Relationships: []
      }
      reading_order_items: {
        Row: {
          book_group_id: string
          created_at: string
          id: string
          is_optional: boolean
          position: number
          reading_order_id: string
        }
        Insert: {
          book_group_id: string
          created_at?: string
          id?: string
          is_optional?: boolean
          position: number
          reading_order_id: string
        }
        Update: {
          book_group_id?: string
          created_at?: string
          id?: string
          is_optional?: boolean
          position?: number
          reading_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_order_items_book_group_id_fkey"
            columns: ["book_group_id"]
            isOneToOne: false
            referencedRelation: "book_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_order_items_book_group_id_fkey"
            columns: ["book_group_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["book_group_id"]
          },
          {
            foreignKeyName: "reading_order_items_reading_order_id_fkey"
            columns: ["reading_order_id"]
            isOneToOne: false
            referencedRelation: "reading_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_order_votes: {
        Row: {
          created_at: string
          reading_order_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          reading_order_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          reading_order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_order_votes_reading_order_id_fkey"
            columns: ["reading_order_id"]
            isOneToOne: false
            referencedRelation: "reading_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_orders: {
        Row: {
          author_user_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          scope_id: string
          scope_type: string
          source: string
        }
        Insert: {
          author_user_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          scope_id: string
          scope_type: string
          source: string
        }
        Update: {
          author_user_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scope_id?: string
          scope_type?: string
          source?: string
        }
        Relationships: []
      }
      reading_targets: {
        Row: {
          anchor_day: number | null
          anchor_month: number | null
          anchor_weekday: number | null
          cadence_unit: string | null
          cadence_value: number
          counts_rereads: boolean
          created_at: string
          deadline_at: string | null
          goal: number
          id: string
          is_home_featured: boolean
          is_private: boolean
          kind: string
          show_on_homepage: boolean
          started_at: string
          unit: string
          user_id: string
        }
        Insert: {
          anchor_day?: number | null
          anchor_month?: number | null
          anchor_weekday?: number | null
          cadence_unit?: string | null
          cadence_value?: number
          counts_rereads?: boolean
          created_at?: string
          deadline_at?: string | null
          goal: number
          id?: string
          is_home_featured?: boolean
          is_private?: boolean
          kind: string
          show_on_homepage?: boolean
          started_at?: string
          unit: string
          user_id: string
        }
        Update: {
          anchor_day?: number | null
          anchor_month?: number | null
          anchor_weekday?: number | null
          cadence_unit?: string | null
          cadence_value?: number
          counts_rereads?: boolean
          created_at?: string
          deadline_at?: string | null
          goal?: number
          id?: string
          is_home_featured?: boolean
          is_private?: boolean
          kind?: string
          show_on_homepage?: boolean
          started_at?: string
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      rejected_trigger_customs: {
        Row: {
          reason: string | null
          rejected_at: string
          value: string
        }
        Insert: {
          reason?: string | null
          rejected_at?: string
          value: string
        }
        Update: {
          reason?: string | null
          rejected_at?: string
          value?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          device_id: string | null
          id: string
          isbn13: string
          scanned_at: string
          user_id: string
        }
        Insert: {
          device_id?: string | null
          id?: string
          isbn13: string
          scanned_at?: string
          user_id: string
        }
        Update: {
          device_id?: string | null
          id?: string
          isbn13?: string
          scanned_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_metrics_snapshots: {
        Row: {
          ai_referrers_by_source: Json | null
          ai_referrers_total: number | null
          bing_clicks: number | null
          bing_impressions: number | null
          bing_indexed: number | null
          captured_at: string
          citation_hits: number | null
          citation_test_set: number | null
          gsc_avg_position: number | null
          gsc_clicks: number | null
          gsc_impressions: number | null
          gsc_indexed: number | null
          id: number
          notes: string | null
        }
        Insert: {
          ai_referrers_by_source?: Json | null
          ai_referrers_total?: number | null
          bing_clicks?: number | null
          bing_impressions?: number | null
          bing_indexed?: number | null
          captured_at?: string
          citation_hits?: number | null
          citation_test_set?: number | null
          gsc_avg_position?: number | null
          gsc_clicks?: number | null
          gsc_impressions?: number | null
          gsc_indexed?: number | null
          id?: number
          notes?: string | null
        }
        Update: {
          ai_referrers_by_source?: Json | null
          ai_referrers_total?: number | null
          bing_clicks?: number | null
          bing_impressions?: number | null
          bing_indexed?: number | null
          captured_at?: string
          citation_hits?: number | null
          citation_test_set?: number | null
          gsc_avg_position?: number | null
          gsc_clicks?: number | null
          gsc_impressions?: number | null
          gsc_indexed?: number | null
          id?: number
          notes?: string | null
        }
        Relationships: []
      }
      seo_referrer_events: {
        Row: {
          country: string | null
          id: number
          occurred_at: string
          path: string
          referrer_host: string
          source: string
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          id?: number
          occurred_at?: string
          path: string
          referrer_host: string
          source: string
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          id?: number
          occurred_at?: string
          path?: string
          referrer_host?: string
          source?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      series: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      series_ingest_unmatched: {
        Row: {
          book_group_id: string
          first_seen_at: string
          id: string
          last_seen_at: string
          raw_name: string
          raw_position: number | null
          resolved_at: string | null
          resolved_series_id: string | null
        }
        Insert: {
          book_group_id: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          raw_name: string
          raw_position?: number | null
          resolved_at?: string | null
          resolved_series_id?: string | null
        }
        Update: {
          book_group_id?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          raw_name?: string
          raw_position?: number | null
          resolved_at?: string | null
          resolved_series_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "series_ingest_unmatched_book_group_id_fkey"
            columns: ["book_group_id"]
            isOneToOne: false
            referencedRelation: "book_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_ingest_unmatched_book_group_id_fkey"
            columns: ["book_group_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["book_group_id"]
          },
          {
            foreignKeyName: "series_ingest_unmatched_resolved_series_id_fkey"
            columns: ["resolved_series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_ingest_unmatched_resolved_series_id_fkey"
            columns: ["resolved_series_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["series_id"]
          },
        ]
      }
      series_items: {
        Row: {
          book_group_id: string
          created_at: string
          id: string
          is_optional: boolean
          notes: string | null
          position: number
          series_id: string
        }
        Insert: {
          book_group_id: string
          created_at?: string
          id?: string
          is_optional?: boolean
          notes?: string | null
          position: number
          series_id: string
        }
        Update: {
          book_group_id?: string
          created_at?: string
          id?: string
          is_optional?: boolean
          notes?: string | null
          position?: number
          series_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_items_book_group_id_fkey"
            columns: ["book_group_id"]
            isOneToOne: false
            referencedRelation: "book_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_items_book_group_id_fkey"
            columns: ["book_group_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["book_group_id"]
          },
          {
            foreignKeyName: "series_items_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_items_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["series_id"]
          },
        ]
      }
      sessions: {
        Row: {
          app_version: string | null
          build_number: string | null
          closed_at: string | null
          id: string
          opened_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          build_number?: string | null
          closed_at?: string | null
          id?: string
          opened_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          build_number?: string | null
          closed_at?: string | null
          id?: string
          opened_at?: string
          user_id?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string
          id: string
          isbn13: string
          short_code: string
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          isbn13: string
          short_code: string
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          isbn13?: string
          short_code?: string
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_links_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "share_links_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books_expanded"
            referencedColumns: ["isbn13"]
          },
        ]
      }
      signups: {
        Row: {
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          name: string
          test_group: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          test_group?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          test_group?: string | null
        }
        Relationships: []
      }
      stack_items: {
        Row: {
          added_at: string
          group_id: string
          position: number
          stack_id: string
        }
        Insert: {
          added_at?: string
          group_id: string
          position?: number
          stack_id: string
        }
        Update: {
          added_at?: string
          group_id?: string
          position?: number
          stack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stack_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "book_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stack_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["book_group_id"]
          },
          {
            foreignKeyName: "stack_items_stack_id_fkey"
            columns: ["stack_id"]
            isOneToOne: false
            referencedRelation: "user_stacks"
            referencedColumns: ["id"]
          },
        ]
      }
      status_updates: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          isbn13: string
          message: string | null
          status: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          isbn13: string
          message?: string | null
          status: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          isbn13?: string
          message?: string | null
          status?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_updates_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "status_updates_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books_expanded"
            referencedColumns: ["isbn13"]
          },
        ]
      }
      subjects: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      survey_experiments: {
        Row: {
          ended_at: string | null
          id: string
          name: string
          notes: string | null
          rollout_strategy: string
          started_at: string
          template_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          name: string
          notes?: string | null
          rollout_strategy: string
          started_at?: string
          template_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          rollout_strategy?: string
          started_at?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_experiments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_options: {
        Row: {
          id: string
          label: string
          metadata: Json
          position: number
          question_id: string
          value: string
        }
        Insert: {
          id?: string
          label: string
          metadata?: Json
          position: number
          question_id: string
          value: string
        }
        Update: {
          id?: string
          label?: string
          metadata?: Json
          position?: number
          question_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          allow_custom: boolean
          id: string
          is_required: boolean
          key: string
          kind: string
          metadata: Json
          position: number
          prompt: string
          template_version_id: string
        }
        Insert: {
          allow_custom?: boolean
          id?: string
          is_required?: boolean
          key: string
          kind: string
          metadata?: Json
          position: number
          prompt: string
          template_version_id: string
        }
        Update: {
          allow_custom?: boolean
          id?: string
          is_required?: boolean
          key?: string
          kind?: string
          metadata?: Json
          position?: number
          prompt?: string
          template_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "survey_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_targeting_rules: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          priority: number
          question_id: string | null
          targets: Json
          template_version_id: string | null
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: number
          question_id?: string | null
          targets?: Json
          template_version_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: number
          question_id?: string | null
          targets?: Json
          template_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_targeting_rules_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_targeting_rules_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "survey_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_template_versions: {
        Row: {
          created_at: string
          experiment_id: string | null
          id: string
          notes: string | null
          template_id: string
          variant_key: string | null
          variant_weight: number
          version: number
        }
        Insert: {
          created_at?: string
          experiment_id?: string | null
          id?: string
          notes?: string | null
          template_id: string
          variant_key?: string | null
          variant_weight?: number
          version: number
        }
        Update: {
          created_at?: string
          experiment_id?: string | null
          id?: string
          notes?: string | null
          template_id?: string
          variant_key?: string | null
          variant_weight?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_template_versions_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "survey_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_templates: {
        Row: {
          active_version_id: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active_version_id?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active_version_id?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_templates_active_version_fk"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "survey_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      target_met_events: {
        Row: {
          actual: number
          created_at: string
          goal: number
          id: string
          period_label: string
          target_id: string
          unit: string
          user_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          actual: number
          created_at?: string
          goal: number
          id?: string
          period_label: string
          target_id: string
          unit: string
          user_id: string
          window_end: string
          window_start: string
        }
        Update: {
          actual?: number
          created_at?: string
          goal?: number
          id?: string
          period_label?: string
          target_id?: string
          unit?: string
          user_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_met_events_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "reading_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      universe_books: {
        Row: {
          book_group_id: string
          created_at: string
          id: string
          is_optional: boolean
          position: number
          universe_id: string
        }
        Insert: {
          book_group_id: string
          created_at?: string
          id?: string
          is_optional?: boolean
          position: number
          universe_id: string
        }
        Update: {
          book_group_id?: string
          created_at?: string
          id?: string
          is_optional?: boolean
          position?: number
          universe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "universe_books_book_group_id_fkey"
            columns: ["book_group_id"]
            isOneToOne: false
            referencedRelation: "book_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "universe_books_book_group_id_fkey"
            columns: ["book_group_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["book_group_id"]
          },
          {
            foreignKeyName: "universe_books_universe_id_fkey"
            columns: ["universe_id"]
            isOneToOne: false
            referencedRelation: "universes"
            referencedColumns: ["id"]
          },
        ]
      }
      universe_series: {
        Row: {
          created_at: string
          id: string
          position: number
          series_id: string
          universe_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: number
          series_id: string
          universe_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          series_id?: string
          universe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "universe_series_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: true
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "universe_series_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: true
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["series_id"]
          },
          {
            foreignKeyName: "universe_series_universe_id_fkey"
            columns: ["universe_id"]
            isOneToOne: false
            referencedRelation: "universes"
            referencedColumns: ["id"]
          },
        ]
      }
      universes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_book_reads: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          isbn13: string
          rating: number | null
          read_number: number
          review: string | null
          review_spoiler: boolean
          reviewed_at: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          isbn13: string
          rating?: number | null
          read_number?: number
          review?: string | null
          review_spoiler?: boolean
          reviewed_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          isbn13?: string
          rating?: number | null
          read_number?: number
          review?: string | null
          review_spoiler?: boolean
          reviewed_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_book_reads_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "user_book_reads_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books_expanded"
            referencedColumns: ["isbn13"]
          },
        ]
      }
      user_books: {
        Row: {
          active_read_id: string | null
          created_at: string
          finished_at: string | null
          format: string | null
          group_id: string | null
          isbn13: string
          ownership: Database["public"]["Enums"]["ownership_t"]
          rating: number | null
          review: string | null
          review_spoiler: boolean
          reviewed_at: string | null
          source: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["read_status_t"]
          updated_at: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          active_read_id?: string | null
          created_at?: string
          finished_at?: string | null
          format?: string | null
          group_id?: string | null
          isbn13: string
          ownership?: Database["public"]["Enums"]["ownership_t"]
          rating?: number | null
          review?: string | null
          review_spoiler?: boolean
          reviewed_at?: string | null
          source?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["read_status_t"]
          updated_at?: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          active_read_id?: string | null
          created_at?: string
          finished_at?: string | null
          format?: string | null
          group_id?: string | null
          isbn13?: string
          ownership?: Database["public"]["Enums"]["ownership_t"]
          rating?: number | null
          review?: string | null
          review_spoiler?: boolean
          reviewed_at?: string | null
          source?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["read_status_t"]
          updated_at?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_books_active_read_id_fkey"
            columns: ["active_read_id"]
            isOneToOne: false
            referencedRelation: "user_book_reads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_books_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "book_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_books_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["book_group_id"]
          },
        ]
      }
      user_favourites: {
        Row: {
          group_id: string | null
          isbn13: string
          position: number
          user_id: string
        }
        Insert: {
          group_id?: string | null
          isbn13: string
          position: number
          user_id: string
        }
        Update: {
          group_id?: string | null
          isbn13?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favourites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "book_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favourites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["book_group_id"]
          },
          {
            foreignKeyName: "user_favourites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_segment_assignments: {
        Row: {
          created_at: string
          segment: string
          user_id: string
        }
        Insert: {
          created_at?: string
          segment: string
          user_id: string
        }
        Update: {
          created_at?: string
          segment?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stacks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      web_vitals_events: {
        Row: {
          country: string | null
          id: number
          metric: string
          navigation_type: string | null
          occurred_at: string
          rating: string | null
          route: string
          user_agent: string | null
          value: number
        }
        Insert: {
          country?: string | null
          id?: number
          metric: string
          navigation_type?: string | null
          occurred_at?: string
          rating?: string | null
          route: string
          user_agent?: string | null
          value: number
        }
        Update: {
          country?: string | null
          id?: number
          metric?: string
          navigation_type?: string | null
          occurred_at?: string
          rating?: string | null
          route?: string
          user_agent?: string | null
          value?: number
        }
        Relationships: []
      }
    }
    Views: {
      book_enrichment_consensus: {
        Row: {
          isbn13: string | null
          question_consensus: Json | null
          response_count: number | null
        }
        Relationships: []
      }
      books_expanded: {
        Row: {
          all_author_names: string[] | null
          date_published: string | null
          first_author_name: string | null
          first_author_sort_name: string | null
          genres: string[] | null
          image: string | null
          image_original: string | null
          isbn13: string | null
          language: string | null
          pages: number | null
          pub_year: number | null
          publisher: string | null
          synopsis: string | null
          title: string | null
        }
        Insert: {
          all_author_names?: never
          date_published?: string | null
          first_author_name?: never
          first_author_sort_name?: never
          genres?: never
          image?: string | null
          image_original?: string | null
          isbn13?: string | null
          language?: string | null
          pages?: number | null
          pub_year?: never
          publisher?: string | null
          synopsis?: string | null
          title?: string | null
        }
        Update: {
          all_author_names?: never
          date_published?: string | null
          first_author_name?: never
          first_author_sort_name?: never
          genres?: never
          image?: string | null
          image_original?: string | null
          isbn13?: string | null
          language?: string | null
          pages?: number | null
          pub_year?: never
          publisher?: string | null
          synopsis?: string | null
          title?: string | null
        }
        Relationships: []
      }
      enrichment_completion_stats: {
        Row: {
          avg_cards_answered: number | null
          avg_cards_shown: number | null
          avg_cards_skipped: number | null
          completed_responses: number | null
          completion_rate_pct: number | null
          experiment_id: string | null
          incomplete_responses: number | null
          template_version_id: string | null
          total_responses: number | null
          variant_key: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_responses_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "survey_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_template_versions_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "survey_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_per_card_dropoff: {
        Row: {
          abandoned_count: number | null
          abandoned_rate_pct: number | null
          answered_count: number | null
          experiment_id: string | null
          question_key: string | null
          skipped_count: number | null
          template_version_id: string | null
          variant_key: string | null
          viewed_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_response_events_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "survey_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_template_versions_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "survey_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_trigger_customs: {
        Row: {
          example_raw: string | null
          frequency: number | null
          value: string | null
        }
        Relationships: []
      }
      series_with_books_expanded: {
        Row: {
          book_group_id: string | null
          canonical_author: string | null
          canonical_title: string | null
          cover_url: string | null
          is_optional: boolean | null
          notes: string | null
          position: number | null
          representative_isbn13: string | null
          series_description: string | null
          series_id: string | null
          series_item_id: string | null
          series_name: string | null
          series_slug: string | null
        }
        Relationships: []
      }
      universe_with_contents_expanded: {
        Row: {
          book_group_id: string | null
          canonical_author: string | null
          canonical_title: string | null
          content_kind: string | null
          cover_url: string | null
          position: number | null
          representative_isbn13: string | null
          series_id: string | null
          series_name: string | null
          series_slug: string | null
          universe_description: string | null
          universe_id: string | null
          universe_name: string | null
          universe_slug: string | null
        }
        Relationships: []
      }
      user_books_expanded: {
        Row: {
          all_author_names: string[] | null
          avg_rating: number | null
          cover_url: string | null
          created_at: string | null
          date_published: string | null
          finished_at: string | null
          first_author_name: string | null
          first_author_sort_name: string | null
          format: string | null
          genres: string[] | null
          group_id: string | null
          image_original: string | null
          isbn13: string | null
          language: string | null
          ownership: Database["public"]["Enums"]["ownership_t"] | null
          pages: number | null
          pub_year: number | null
          publisher: string | null
          rating: number | null
          review: string | null
          review_spoiler: boolean | null
          reviewed_at: string | null
          source: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["read_status_t"] | null
          synopsis: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_books_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "book_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_books_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["book_group_id"]
          },
        ]
      }
      user_books_expanded_all: {
        Row: {
          all_author_names: string[] | null
          avg_rating: number | null
          cover_url: string | null
          created_at: string | null
          date_published: string | null
          finished_at: string | null
          first_author_name: string | null
          first_author_sort_name: string | null
          format: string | null
          genres: string[] | null
          group_id: string | null
          image_original: string | null
          isbn13: string | null
          language: string | null
          ownership: Database["public"]["Enums"]["ownership_t"] | null
          pages: number | null
          pub_year: number | null
          publisher: string | null
          rating: number | null
          review: string | null
          review_spoiler: boolean | null
          started_at: string | null
          status: Database["public"]["Enums"]["read_status_t"] | null
          synopsis: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_books_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "book_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_books_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "series_with_books_expanded"
            referencedColumns: ["book_group_id"]
          },
        ]
      }
    }
    Functions: {
      accept_friend_invite: { Args: { invite_token: string }; Returns: string }
      add_activity_comment: {
        Args: {
          p_activity_type: string
          p_activity_user_id: string
          p_body: string
          p_isbn13: string
          p_mentions?: string[]
          p_parent_id?: string
          p_tagged_books?: string[]
        }
        Returns: {
          activity_type: string
          activity_user_id: string
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_username: string
          body: string
          created_at: string
          edited_at: string
          id: string
          isbn13: string
          mentions: string[]
          parent_id: string
          tagged_books: string[]
        }[]
      }
      add_book_to_library: {
        Args: {
          p_authors: string[]
          p_date_published: string
          p_finished_at?: string
          p_image: string
          p_image_original: string
          p_isbn13: string
          p_ownership?: Database["public"]["Enums"]["ownership_t"]
          p_rating?: number
          p_review?: string
          p_started_at?: string
          p_status?: Database["public"]["Enums"]["read_status_t"]
          p_subjects: string[]
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      add_user_to_all_friendships: {
        Args: { new_user: string }
        Returns: undefined
      }
      author_slug: { Args: { p_id: string; p_name: string }; Returns: string }
      authors_for_book: {
        Args: { isbn13_in: string }
        Returns: {
          name: string
        }[]
      }
      block_user: { Args: { p_blocked_id: string }; Returns: undefined }
      book_by_isbn: {
        Args: { q: string }
        Returns: {
          author: string
          cover_url: string
          isbn13: string
          pub_year: number
          title: string
        }[]
      }
      book_search: {
        Args: { q: string }
        Returns: {
          author: string
          cover_url: string
          isbn13: string
          pub_year: number
          title: string
        }[]
      }
      book_search_with_enrichment: {
        Args: { q: string }
        Returns: {
          author: string
          cover_url: string
          enrichment: Json
          isbn13: string
          pub_year: number
          title: string
        }[]
      }
      canonical_isbn_for_group: {
        Args: { p_group_id: string }
        Returns: string
      }
      check_username_available: { Args: { p_username: string }; Returns: Json }
      clear_user_favourite: { Args: { p_position: number }; Returns: undefined }
      compute_sort_name: { Args: { author_name: string }; Returns: string }
      consensus_value_share: {
        Args: {
          consensus: Json
          question_key: string
          response_count: number
          target_value: string
        }
        Returns: number
      }
      create_friend_request: { Args: { target_user_id: string }; Returns: Json }
      create_post: {
        Args: {
          p_image_urls?: string[]
          p_mentions?: string[]
          p_quoted_activity_isbn13?: string
          p_quoted_activity_type?: string
          p_quoted_activity_user_id?: string
          p_tagged_books?: string[]
          p_text_content: string
          p_visibility?: string
        }
        Returns: string
      }
      create_share_link: {
        Args: {
          p_isbn13: string
          p_utm_campaign?: string
          p_utm_medium?: string
          p_utm_source?: string
        }
        Returns: string
      }
      delete_activity: {
        Args: { p_activity_type: string; p_isbn13: string }
        Returns: undefined
      }
      delete_activity_comment: {
        Args: { p_comment_id: string }
        Returns: boolean
      }
      delete_post: { Args: { p_post_id: string }; Returns: undefined }
      delete_read: { Args: { p_read_id: string }; Returns: undefined }
      dismiss_onboarding_survey: { Args: never; Returns: undefined }
      edit_activity_comment: {
        Args: {
          p_body: string
          p_comment_id: string
          p_mentions?: string[]
          p_tagged_books?: string[]
        }
        Returns: {
          activity_type: string
          activity_user_id: string
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_username: string
          body: string
          created_at: string
          edited_at: string
          id: string
          isbn13: string
          mentions: string[]
          parent_id: string
          tagged_books: string[]
        }[]
      }
      edit_post: {
        Args: {
          p_mentions?: string[]
          p_post_id: string
          p_tagged_books?: string[]
          p_text_content: string
        }
        Returns: undefined
      }
      end_analytics_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      enrich_book:
        | {
            Args: {
              p_authors?: string[]
              p_cover_url?: string
              p_isbn13: string
              p_pub_year?: number
              p_publisher?: string
              p_subtitle?: string
              p_title?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_authors?: string[]
              p_cover_url?: string
              p_google_rating?: number
              p_google_review_count?: number
              p_google_volume_id?: string
              p_isbn13: string
              p_language_code?: string
              p_long_description?: string
              p_page_count?: number
              p_pub_year?: number
              p_publisher?: string
              p_short_description?: string
              p_subtitle?: string
              p_title?: string
            }
            Returns: undefined
          }
      facet_slugify: { Args: { p_value: string }; Returns: string }
      finalize_broadcast_campaign: {
        Args: { p_campaign_id: string }
        Returns: Json
      }
      get_active_survey_template: {
        Args: { p_name: string; p_user_id?: string }
        Returns: Json
      }
      get_activity_comments: {
        Args: {
          p_activity_type: string
          p_activity_user_id: string
          p_isbn13: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          activity_type: string
          activity_user_id: string
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_username: string
          body: string
          created_at: string
          edited_at: string
          id: string
          isbn13: string
          mentions: string[]
          parent_id: string
          tagged_books: string[]
        }[]
      }
      get_activity_feed: {
        Args: {
          p_activity_type?: string
          p_include_test_users?: boolean
          p_limit?: number
          p_offset?: number
          p_user_id?: string
        }
        Returns: {
          activity_type: string
          avatar_url: string
          badge_type: string
          book_image: string
          book_isbn13: string
          book_title: string
          created_at: string
          display_name: string
          id: string
          ownership: string
          rating: number
          review: string
          review_spoiler: boolean
          status: string
          status_image_url: string
          status_message: string
          user_id: string
          username: string
        }[]
      }
      get_author_by_slug: {
        Args: { p_slug: string }
        Returns: {
          book_count: number
          earliest_year: number
          id: string
          latest_year: number
          name: string
          slug: string
          sort_name: string
          top_genres: string[]
        }[]
      }
      get_author_slug_for_isbn: {
        Args: { p_isbn13: string }
        Returns: {
          author_id: string
          name: string
          slug: string
        }[]
      }
      get_authors_for_sitemap: {
        Args: never
        Returns: {
          id: string
          slug: string
        }[]
      }
      get_best_of_year: {
        Args: { p_limit?: number; p_year: number }
        Returns: {
          avg_rating: number
          first_author_name: string
          image: string
          isbn13: string
          pub_year: number
          rating_count: number
          title: string
          total_for_year: number
          weighted_score: number
        }[]
      }
      get_book_activity: {
        Args: { p_isbn13: string; p_limit?: number; p_offset?: number }
        Returns: {
          activity_type: string
          avatar_url: string
          book_image: string
          book_isbn13: string
          book_title: string
          created_at: string
          display_name: string
          id: string
          ownership: string
          rating: number
          review: string
          review_spoiler: boolean
          status: string
          status_image_url: string
          status_message: string
          user_id: string
          username: string
        }[]
      }
      get_book_stats: {
        Args: { p_isbn13: string }
        Returns: {
          avg_rating: number
          isbn13: string
          num_reviews: number
          title: string
        }[]
      }
      get_book_stats_batch: {
        Args: { p_isbn13s: string[] }
        Returns: {
          avg_rating: number
          isbn13: string
          num_reviews: number
          title: string
        }[]
      }
      get_books_by_enrichment_facet: {
        Args: { p_facet_key: string; p_limit?: number; p_value: string }
        Returns: {
          first_author_name: string
          image: string
          isbn13: string
          pub_year: number
          title: string
          total_for_value: number
          votes: number
        }[]
      }
      get_books_by_genre: {
        Args: { p_limit?: number; p_slug: string }
        Returns: {
          first_author_name: string
          genre_label: string
          image: string
          isbn13: string
          pub_year: number
          title: string
          total_in_genre: number
          votes: number
        }[]
      }
      get_books_in_common: {
        Args: { friend_id: string }
        Returns: {
          cover_url: string
          first_author_name: string
          friend_finished_at: string
          friend_rating: number
          friend_review: string
          friend_started_at: string
          friend_status: string
          group_id: string
          isbn13: string
          title: string
          your_finished_at: string
          your_rating: number
          your_review: string
          your_started_at: string
          your_status: string
        }[]
      }
      get_browse_facets_for_sitemap: {
        Args: never
        Returns: {
          facet: string
          slug: string
          total: number
          value_label: string
        }[]
      }
      get_browse_index: {
        Args: never
        Returns: {
          facet: string
          slug: string
          total: number
          value_label: string
        }[]
      }
      get_comment_counts_for_activities: {
        Args: {
          p_activity_types: string[]
          p_activity_user_ids: string[]
          p_isbn13s: string[]
        }
        Returns: {
          activity_type: string
          activity_user_id: string
          count: number
          isbn13: string
        }[]
      }
      get_daily_sign_in_summary: {
        Args: never
        Returns: {
          last_app_version: string
          session_count: number
          user_id: string
        }[]
      }
      get_edge_function_url: {
        Args: { function_name: string }
        Returns: string
      }
      get_editions_for_book_group: {
        Args: { p_group_id: string }
        Returns: {
          image: string
          isbn13: string
          page_count: number
          published_date: string
          publisher: string
          title: string
        }[]
      }
      get_expanded_book_consensus: {
        Args: { p_isbn13: string }
        Returns: {
          isbn13: string
          question_histograms: Json
          rating_avg: number
          rating_count: number
          rating_distribution: Json
          response_count: number
        }[]
      }
      get_finished_reads_count: {
        Args: { p_since: string; p_until: string; p_user_id: string }
        Returns: number
      }
      get_footer_links: { Args: never; Returns: Json }
      get_friend_book_detail: {
        Args: { friend_id: string; isbn13_input: string }
        Returns: {
          authors: string[]
          cover_url: string
          description: string
          friend_finished_at: string
          friend_rating: number
          friend_review: string
          friend_started_at: string
          friend_status: string
          isbn13: string
          title: string
          your_finished_at: string
          your_rating: number
          your_review: string
          your_started_at: string
          your_status: string
        }[]
      }
      get_friend_book_meta: {
        Args: { p_friend_id: string; p_isbn13: string }
        Returns: {
          all_author_names: string[] | null
          avg_rating: number | null
          cover_url: string | null
          created_at: string | null
          date_published: string | null
          finished_at: string | null
          first_author_name: string | null
          first_author_sort_name: string | null
          format: string | null
          genres: string[] | null
          group_id: string | null
          image_original: string | null
          isbn13: string | null
          language: string | null
          ownership: Database["public"]["Enums"]["ownership_t"] | null
          pages: number | null
          pub_year: number | null
          publisher: string | null
          rating: number | null
          review: string | null
          review_spoiler: boolean | null
          started_at: string | null
          status: Database["public"]["Enums"]["read_status_t"] | null
          synopsis: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "user_books_expanded_all"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_friend_enrichment_for_isbns: {
        Args: { p_isbn13s: string[] }
        Returns: {
          answers: Json
          display_name: string
          isbn13: string
          updated_at: string
          user_id: string
        }[]
      }
      get_friend_library: {
        Args: { friend_id: string }
        Returns: {
          all_author_names: string[] | null
          avg_rating: number | null
          cover_url: string | null
          created_at: string | null
          date_published: string | null
          finished_at: string | null
          first_author_name: string | null
          first_author_sort_name: string | null
          format: string | null
          genres: string[] | null
          group_id: string | null
          image_original: string | null
          isbn13: string | null
          language: string | null
          ownership: Database["public"]["Enums"]["ownership_t"] | null
          pages: number | null
          pub_year: number | null
          publisher: string | null
          rating: number | null
          review: string | null
          review_spoiler: boolean | null
          started_at: string | null
          status: Database["public"]["Enums"]["read_status_t"] | null
          synopsis: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "user_books_expanded_all"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_friend_reading_timeline: {
        Args: { p_friend_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          author_names: string[]
          cover_url: string
          finished_at: string
          id: string
          isbn13: string
          rating: number
          read_number: number
          review: string
          started_at: string
          status: string
          title: string
        }[]
      }
      get_friend_suggestions: {
        Args: { p_include_test_users?: boolean; p_limit?: number }
        Returns: {
          avatar_url: string
          badge_type: string
          display_name: string
          mutual_friends: number
          reason: string
          shared_books: number
          user_id: string
          username: string
        }[]
      }
      get_friend_target_history: {
        Args: { friend_id: string }
        Returns: Database["public"]["CompositeTypes"]["friend_target_period"][]
        SetofOptions: {
          from: "*"
          to: "friend_target_period"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_friend_target_progress: {
        Args: { friend_id: string }
        Returns: Database["public"]["CompositeTypes"]["friend_target_progress"][]
        SetofOptions: {
          from: "*"
          to: "friend_target_progress"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_friends_activity_feed: {
        Args: {
          p_activity_type?: string
          p_include_friends?: boolean
          p_include_own?: boolean
          p_include_test_users?: boolean
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          activity_type: string
          avatar_url: string
          book_image: string
          book_isbn13: string
          book_title: string
          created_at: string
          display_name: string
          id: string
          ownership: string
          rating: number
          review: string
          review_spoiler: boolean
          status: string
          status_image_url: string
          status_message: string
          user_id: string
          username: string
        }[]
      }
      get_friends_reviews_for_book: {
        Args: {
          p_exclude_user_id?: string
          p_isbn13: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          ownership: string
          rating: number
          review: string
          review_spoiler: boolean
          status: string
          user_id: string
        }[]
      }
      get_friends_with_book: {
        Args: {
          p_exclude_user_id?: string
          p_isbn13: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          ownership: string
          rating: number
          review: string
          review_spoiler: boolean
          status: string
          user_id: string
        }[]
      }
      get_habit_streaks: { Args: { p_user_id: string }; Returns: Json }
      get_lists_for_sitemap: {
        Args: never
        Returns: {
          kind: string
          slug: string
          total: number
        }[]
      }
      get_more_books_by_author: {
        Args: { p_isbn13: string; p_limit?: number }
        Returns: {
          date_published: string
          image: string
          isbn13: string
          pub_year: number
          title: string
        }[]
      }
      get_notification_preferences: {
        Args: never
        Returns: {
          comment_reactions: boolean
          comment_replies: boolean
          comments: boolean
          friend_activity: boolean
          library_adds: boolean
          mentions: boolean
          post_reactions: boolean
          recommendation_responses: boolean
        }[]
      }
      get_notifications: {
        Args: { p_limit?: number }
        Returns: {
          actor_avatar_url: string
          actor_display_name: string
          actor_id: string
          actor_username: string
          created_at: string
          id: string
          read_at: string
          reference_id: string
          reference_meta: Json
          type: string
        }[]
      }
      get_other_books_by_authors: {
        Args: { p_isbn13: string; p_limit?: number }
        Returns: {
          authors: string[]
          avg_rating: number
          image: string
          isbn13: string
          num_reviews: number
          title: string
        }[]
      }
      get_popular_books: {
        Args: { p_limit?: number }
        Returns: {
          date_published: string
          finished_users: number
          first_author_name: string
          image: string
          isbn13: string
          pub_year: number
          title: string
          users_with_book: number
        }[]
      }
      get_popular_books_with_enrichment: {
        Args: { p_limit?: number }
        Returns: {
          date_published: string
          enrichment: Json
          finished_users: number
          first_author_name: string
          image: string
          isbn13: string
          pub_year: number
          title: string
          users_with_book: number
        }[]
      }
      get_post_detail: {
        Args: { p_post_id: string }
        Returns: {
          avatar_url: string
          badge_type: string
          created_at: string
          display_name: string
          edited_at: string
          id: string
          image_urls: string[]
          mentions: string[]
          quoted_activity_isbn13: string
          quoted_activity_type: string
          quoted_activity_user_id: string
          quoted_avatar_url: string
          quoted_book_image: string
          quoted_book_title: string
          quoted_display_name: string
          quoted_post_image: string
          quoted_post_text: string
          quoted_rating: number
          tagged_books: string[]
          text_content: string
          user_id: string
          username: string
          visibility: string
        }[]
      }
      get_post_details_for_posts: {
        Args: { p_post_ids: string[] }
        Returns: {
          avatar_url: string
          badge_type: string
          created_at: string
          display_name: string
          edited_at: string
          id: string
          image_urls: string[]
          mentions: string[]
          quoted_activity_isbn13: string
          quoted_activity_type: string
          quoted_activity_user_id: string
          quoted_avatar_url: string
          quoted_book_image: string
          quoted_book_title: string
          quoted_display_name: string
          quoted_post_image: string
          quoted_post_text: string
          quoted_rating: number
          tagged_books: string[]
          text_content: string
          user_id: string
          username: string
          visibility: string
        }[]
      }
      get_profile: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          description: string
          display_name: string
          id: string
          joined_at: string
          phone_number: string
        }[]
      }
      get_public_library_for_user: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          finished_at: string
          first_author_name: string
          image: string
          isbn13: string
          pub_year: number
          rating: number
          started_at: string
          status: string
          title: string
        }[]
      }
      get_public_profile_by_username: {
        Args: { p_username: string }
        Returns: {
          avatar_url: string
          badge_type: string
          description: string
          display_name: string
          id: string
          joined_at: string
          public_book_count: number
          public_finished_count: number
          public_review_count: number
          public_stack_count: number
          username: string
        }[]
      }
      get_public_review_summary_for_isbn: {
        Args: { p_isbn13: string }
        Returns: {
          avg_rating: number
          review_count: number
        }[]
      }
      get_public_reviews_for_book: {
        Args: { p_isbn13: string; p_limit?: number; p_offset?: number }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          rating: number
          review: string
          review_spoiler: boolean
          user_id: string
        }[]
      }
      get_public_reviews_for_isbn: {
        Args: { p_isbn13: string; p_limit?: number }
        Returns: {
          avatar_url: string
          badge_type: string
          created_at: string
          display_name: string
          finished_at: string
          rating: number
          review: string
          user_id: string
          username: string
        }[]
      }
      get_public_reviews_for_user: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          created_at: string
          finished_at: string
          first_author_name: string
          image: string
          isbn13: string
          rating: number
          review: string
          title: string
        }[]
      }
      get_public_stacks_for_user: {
        Args: { p_user_id: string }
        Returns: {
          cover_isbn13: string
          created_at: string
          description: string
          id: string
          item_count: number
          name: string
          updated_at: string
        }[]
      }
      get_qualified_profiles_for_sitemap: {
        Args: never
        Returns: {
          has_library: boolean
          has_lists: boolean
          has_reviews: boolean
          username: string
        }[]
      }
      get_reactions_detail_for_activity: {
        Args: {
          p_activity_type: string
          p_activity_user_id: string
          p_isbn13: string
        }
        Returns: {
          avatar_url: string
          display_name: string
          emoji: string
          reacted_at: string
          reactor_id: string
        }[]
      }
      get_reactions_detail_for_comment: {
        Args: { p_comment_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          emoji: string
          reacted_at: string
          reactor_id: string
        }[]
      }
      get_reactions_for_activities: {
        Args: {
          p_activity_types: string[]
          p_activity_user_ids: string[]
          p_isbn13s: string[]
        }
        Returns: {
          activity_type: string
          activity_user_id: string
          count: number
          emoji: string
          isbn13: string
          reacted_by_me: boolean
        }[]
      }
      get_reactions_for_comments: {
        Args: { p_comment_ids: string[] }
        Returns: {
          comment_id: string
          count: number
          emoji: string
          reacted_by_me: boolean
        }[]
      }
      get_read_history: {
        Args: { p_isbn13: string; p_user_id?: string }
        Returns: {
          created_at: string
          finished_at: string
          id: string
          rating: number
          read_number: number
          review: string
          review_spoiler: boolean
          started_at: string
          status: string
        }[]
      }
      get_reading_order: {
        Args: { p_order_id: string }
        Returns: {
          book_group_id: string
          canonical_author: string
          canonical_title: string
          cover_url: string
          is_optional: boolean
          item_id: string
          position: number
          reading_order_id: string
          reading_order_name: string
          reading_order_source: string
          representative_isbn13: string
          scope_id: string
          scope_type: string
        }[]
      }
      get_reading_timeline: {
        Args: never
        Returns: {
          author_names: string[]
          cover_url: string
          finished_at: string
          id: string
          isbn13: string
          rating: number
          read_number: number
          review: string
          started_at: string
          status: string
          title: string
        }[]
      }
      get_series_by_slug: {
        Args: { p_slug: string }
        Returns: {
          book_count: number
          description: string
          earliest_year: number
          id: string
          latest_year: number
          name: string
          primary_author_name: string
          primary_author_slug: string
          slug: string
          universe_id: string
          universe_name: string
          universe_slug: string
        }[]
      }
      get_series_for_book_group: {
        Args: { p_book_group_id: string }
        Returns: {
          current_is_optional: boolean
          current_position: number
          next_book_group_id: string
          next_cover_url: string
          next_is_optional: boolean
          next_isbn13: string
          next_position: number
          next_title: string
          prev_book_group_id: string
          prev_cover_url: string
          prev_is_optional: boolean
          prev_isbn13: string
          prev_position: number
          prev_title: string
          series_id: string
          series_name: string
          series_slug: string
          total_count: number
          universe_id: string
          universe_name: string
          universe_slug: string
        }[]
      }
      get_series_for_isbn: {
        Args: { p_isbn13: string }
        Returns: {
          name: string
          pos: number
          series_id: string
          slug: string
        }[]
      }
      get_series_for_sitemap: {
        Args: never
        Returns: {
          slug: string
        }[]
      }
      get_series_members: {
        Args: { p_series_id: string }
        Returns: {
          image: string
          is_optional: boolean
          isbn13: string
          notes: string
          pos: number
          pub_year: number
          title: string
        }[]
      }
      get_service_role_key: { Args: never; Returns: string }
      get_stack_items: {
        Args: { p_stack_id: string }
        Returns: {
          added_at: string
          authors: string
          cover_url: string
          group_id: string
          isbn13: string
          position: number
          stack_id: string
          title: string
        }[]
      }
      get_stacks_for_book: {
        Args: { p_group_id: string }
        Returns: {
          is_member: boolean
          name: string
          stack_id: string
        }[]
      }
      get_top_rated_by_genre: {
        Args: { p_limit?: number; p_slug: string }
        Returns: {
          avg_rating: number
          first_author_name: string
          genre_label: string
          image: string
          isbn13: string
          pub_year: number
          rating_count: number
          title: string
          total_in_genre: number
          weighted_score: number
        }[]
      }
      get_universe_by_slug: {
        Args: { p_slug: string }
        Returns: {
          description: string
          id: string
          name: string
          series_count: number
          slug: string
          standalone_book_count: number
        }[]
      }
      get_universe_series: {
        Args: { p_universe_id: string }
        Returns: {
          book_count: number
          cover_isbn13: string
          name: string
          pos: number
          series_id: string
          slug: string
        }[]
      }
      get_universe_standalones: {
        Args: { p_universe_id: string }
        Returns: {
          image: string
          isbn13: string
          pos: number
          pub_year: number
          title: string
        }[]
      }
      get_universes_for_sitemap: {
        Args: never
        Returns: {
          slug: string
        }[]
      }
      get_unread_notification_count: { Args: never; Returns: number }
      get_user_favourites: {
        Args: { p_user_id: string }
        Returns: {
          group_id: string
          isbn13: string
          position: number
        }[]
      }
      get_user_library_authors: { Args: never; Returns: string[] }
      get_user_library_genres: { Args: never; Returns: string[] }
      get_user_library_page: {
        Args: {
          p_ascending?: boolean
          p_filters?: Json
          p_group_editions?: boolean
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort?: string
        }
        Returns: {
          all_author_names: string[]
          avg_rating: number
          cover_url: string
          created_at: string
          date_published: string
          edition_count: number
          finished_at: string
          first_author_name: string
          first_author_sort_name: string
          format: string
          genres: string[]
          group_id: string
          image_original: string
          isbn13: string
          language: string
          ownership: string
          pages: number
          pub_year: number
          publisher: string
          rating: number
          review: string
          review_spoiler: boolean
          reviewed_at: string
          source: string
          started_at: string
          status: string
          synopsis: string
          title: string
          total_count: number
          updated_at: string
          user_id: string
          visibility: string
        }[]
      }
      get_user_stacks: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          description: string
          id: string
          item_count: number
          name: string
          position: number
          updated_at: string
          user_id: string
          visibility: string
        }[]
      }
      get_works_for_author: {
        Args: { p_author_id: string; p_limit?: number }
        Returns: {
          date_published: string
          image: string
          isbn13: string
          pages: number
          pub_year: number
          title: string
        }[]
      }
      has_completed_onboarding_survey: { Args: never; Returns: boolean }
      ingest_raw_series_for_book_group: {
        Args: { p_book_group_id: string }
        Returns: {
          position: number
          series_id: string
          status: string
        }[]
      }
      insert_status_update: {
        Args: {
          p_image_url?: string
          p_isbn13: string
          p_message?: string
          p_status: string
          p_visibility?: string
        }
        Returns: string
      }
      is_in_segment: {
        Args: { p_segment: string; p_user_id: string }
        Returns: boolean
      }
      is_username_reserved: { Args: { p_username: string }; Returns: boolean }
      is_valid_isbn10: { Args: { in_raw: string }; Returns: boolean }
      list_reading_orders_for_scope: {
        Args: { p_scope_id: string; p_scope_type: string }
        Returns: {
          author_name: string
          author_user_id: string
          created_at: string
          description: string
          id: string
          name: string
          source: string
          viewer_voted: boolean
          vote_count: number
        }[]
      }
      log_link_click: {
        Args: {
          p_ip_hash?: string
          p_referrer?: string
          p_short_code: string
          p_user_agent?: string
          p_visitor_fingerprint?: string
        }
        Returns: Json
      }
      mark_notifications_read: { Args: never; Returns: undefined }
      normalise_for_grouping: { Args: { val: string }; Returns: string }
      normalise_trigger_custom: { Args: { p_value: string }; Returns: string }
      normalize_genre_name: { Args: { raw_name: string }; Returns: string }
      normalize_isbn: { Args: { in_raw: string }; Returns: string }
      notify_library_add_from_post: {
        Args: {
          p_activity_type: string
          p_activity_user_id: string
          p_isbn13: string
        }
        Returns: undefined
      }
      popular_books: {
        Args: {
          p_days?: number
          p_limit?: number
          p_status?: Database["public"]["Enums"]["read_status_t"]
        }
        Returns: {
          adds: number
          author: string
          avg_rating: number
          cover_url: string
          isbn13: string
          pub_year: number
          title: string
        }[]
      }
      post_target_met: {
        Args: {
          p_actual: number
          p_goal: number
          p_period_label: string
          p_target_id: string
          p_unit: string
          p_window_end: string
          p_window_start: string
        }
        Returns: string
      }
      promote_custom_trigger: {
        Args: { p_preset_label: string; p_value: string }
        Returns: undefined
      }
      reconcile_link_clicks: {
        Args: { p_visitor_fingerprint: string }
        Returns: number
      }
      record_analytics_event: {
        Args: {
          p_action: string
          p_book_isbn13?: string
          p_event_type: string
          p_follow_up_action?: string
          p_friend_user_id?: string
          p_metadata?: Json
          p_query_length?: number
          p_rating?: number
          p_result_count?: number
          p_review_length?: number
          p_screen_name?: string
          p_session_id: string
          p_source?: string
          p_source_screen?: string
        }
        Returns: string
      }
      reject_custom_trigger: {
        Args: { p_reason?: string; p_value: string }
        Returns: undefined
      }
      remove_friend: { Args: { p_friend_id: string }; Returns: undefined }
      reorder_stack_items: {
        Args: { p_group_ids: string[]; p_stack_id: string }
        Returns: undefined
      }
      report_content: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_notes?: string
          p_reason: string
        }
        Returns: undefined
      }
      resolve_survey_template: {
        Args: { p_isbn13?: string; p_name: string; p_user_id?: string }
        Returns: Json
      }
      respond_to_friend_request: {
        Args: { friendship_id: string; response: string }
        Returns: Json
      }
      rule_targets_match: {
        Args: { p_isbn13: string; p_targets: Json; p_user_id: string }
        Returns: boolean
      }
      search_books_for_tag: {
        Args: { p_query?: string }
        Returns: {
          author_name: string
          cover_url: string
          isbn13: string
          title: string
        }[]
      }
      search_books_with_filters: {
        Args: {
          p_filters?: Json
          p_limit?: number
          p_query: string
          p_sort?: string
        }
        Returns: {
          author: string
          cover_url: string
          enrichment: Json
          isbn13: string
          pub_year: number
          title: string
        }[]
      }
      search_friends_for_mention: {
        Args: { p_query?: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
      search_users: {
        Args: {
          p_include_test_users?: boolean
          p_limit?: number
          p_offset?: number
          p_query: string
        }
        Returns: {
          avatar_url: string
          badge_type: string
          display_name: string
          friendship_status: string
          user_id: string
          username: string
        }[]
      }
      set_user_favourite: {
        Args: { p_isbn13: string; p_position: number }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_analytics_session: {
        Args: {
          p_app_version: string
          p_build_environment: string
          p_device_type: string
          p_os_version: string
        }
        Returns: string
      }
      start_new_read: { Args: { p_isbn13: string }; Returns: string }
      subjects_for_book: {
        Args: { isbn13_in: string }
        Returns: {
          name: string
        }[]
      }
      submit_onboarding_survey: {
        Args: { p_answers: Json; p_completed?: boolean }
        Returns: undefined
      }
      target_matches: {
        Args: {
          p_isbn13: string
          p_type: string
          p_user_id: string
          p_value: string
        }
        Returns: boolean
      }
      toggle_activity_reaction: {
        Args: {
          p_activity_type: string
          p_activity_user_id: string
          p_emoji: string
          p_isbn13: string
        }
        Returns: Json
      }
      toggle_comment_reaction: {
        Args: { p_comment_id: string; p_emoji: string }
        Returns: Json
      }
      trigger_broadcast_campaign: {
        Args: { p_campaign_id: string }
        Returns: Json
      }
      unblock_user: { Args: { p_blocked_id: string }; Returns: undefined }
      update_book_popularity_stats: {
        Args: { p_isbn13: string }
        Returns: undefined
      }
      update_book_rating_stats: {
        Args: { p_isbn13: string }
        Returns: undefined
      }
      update_campaign_delivery_status: {
        Args: { p_campaign_id: string; p_status: string; p_user_id: string }
        Returns: undefined
      }
      update_profile: {
        Args: {
          avatar_url?: string
          description?: string
          display_name: string
          phone_number?: string
        }
        Returns: undefined
      }
      update_profile_activity: {
        Args: { p_app_version: string }
        Returns: undefined
      }
      update_username: { Args: { p_username: string }; Returns: Json }
      upsert_author_and_link: {
        Args: {
          author_name_in: string
          isbn13_in: string
          ord_in?: number
          sort_name_in?: string
        }
        Returns: undefined
      }
      upsert_book_isbn10: {
        Args: { _isbn10: string; _isbn13: string; _source?: string }
        Returns: undefined
      }
      upsert_device_token: {
        Args: { p_environment: string; p_platform: string; p_token: string }
        Returns: undefined
      }
      upsert_genre_and_link: {
        Args: { genre_name_in: string; isbn13_in: string }
        Returns: undefined
      }
      upsert_notification_preferences: {
        Args: {
          p_comment_reactions?: boolean
          p_comment_replies?: boolean
          p_comments?: boolean
          p_friend_activity?: boolean
          p_library_adds?: boolean
          p_mentions?: boolean
          p_post_reactions?: boolean
          p_recommendation_responses?: boolean
        }
        Returns: undefined
      }
      upsert_series_item: {
        Args: {
          p_book_group_id: string
          p_is_optional?: boolean
          p_position: number
          p_series_id: string
        }
        Returns: string
      }
      upsert_subject_and_link: {
        Args: { isbn13_in: string; subject_name_in: string }
        Returns: undefined
      }
      upsert_user_book: {
        Args: {
          p_finished_at: string
          p_isbn13: string
          p_ownership: string
          p_rating: number
          p_review: string
          p_started_at: string
          p_status: string
          p_user_id: string
        }
        Returns: undefined
      }
      value_in_array: {
        Args: { entries: Json; filter: Json }
        Returns: boolean
      }
    }
    Enums: {
      news_post_status_t: "draft" | "published"
      news_post_type_t:
        | "featured_review"
        | "release_notes_app"
        | "release_notes_website"
        | "article"
        | "announcement"
        | "book_spotlight"
        | "book_list"
      ownership_t: "owned" | "borrowed" | "not_owned"
      read_status_t: "to_read" | "reading" | "finished" | "dnf"
      report_content_type: "post" | "comment" | "review" | "profile"
      report_reason_t:
        | "spam"
        | "harassment"
        | "inappropriate"
        | "misinformation"
    }
    CompositeTypes: {
      friend_target_period: {
        target_id: string | null
        period_start: string | null
        period_end: string | null
        progress: number | null
      }
      friend_target_progress: {
        target_id: string | null
        progress: number | null
      }
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
      news_post_status_t: ["draft", "published"],
      news_post_type_t: [
        "featured_review",
        "release_notes_app",
        "release_notes_website",
        "article",
        "announcement",
        "book_spotlight",
        "book_list",
      ],
      ownership_t: ["owned", "borrowed", "not_owned"],
      read_status_t: ["to_read", "reading", "finished", "dnf"],
      report_content_type: ["post", "comment", "review", "profile"],
      report_reason_t: [
        "spam",
        "harassment",
        "inappropriate",
        "misinformation",
      ],
    },
  },
} as const
