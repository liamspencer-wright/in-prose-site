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
      _test_consensus_seed: {
        Row: {
          isbn13: string
          seeded_at: string
          user_id: string
        }
        Insert: {
          isbn13: string
          seeded_at?: string
          user_id: string
        }
        Update: {
          isbn13?: string
          seeded_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      news_posts: {
        Row: {
          id: string
          title: string
          slug: string
          type: "featured_review" | "release_notes_app" | "release_notes_website" | "article" | "announcement" | "book_spotlight" | "book_list"
          body: string
          excerpt: string | null
          cover_image_url: string | null
          status: "draft" | "published"
          published_at: string | null
          author_id: string | null
          spotlight_book_group_id: string | null
          book_list_entries: Json | null
          image_urls: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          type: "featured_review" | "release_notes_app" | "release_notes_website" | "article" | "announcement" | "book_spotlight" | "book_list"
          body?: string
          excerpt?: string | null
          cover_image_url?: string | null
          status?: "draft" | "published"
          published_at?: string | null
          author_id?: string | null
          spotlight_book_group_id?: string | null
          book_list_entries?: Json | null
          image_urls?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          type?: "featured_review" | "release_notes_app" | "release_notes_website" | "article" | "announcement" | "book_spotlight" | "book_list"
          body?: string
          excerpt?: string | null
          cover_image_url?: string | null
          status?: "draft" | "published"
          published_at?: string | null
          author_id?: string | null
          spotlight_book_group_id?: string | null
          book_list_entries?: Json | null
          image_urls?: string[]
          created_at?: string
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
        ]
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
        ]
      }
      user_favourites: {
        Row: {
          isbn13: string
          position: number
          user_id: string
        }
        Insert: {
          isbn13: string
          position: number
          user_id: string
        }
        Update: {
          isbn13?: string
          position?: number
          user_id?: string
        }
        Relationships: [
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
      user_books_expanded: {
        Row: {
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
      check_username_available: { Args: { p_username: string }; Returns: Json }
      clear_user_favourite: { Args: { p_position: number }; Returns: undefined }
      compute_sort_name: { Args: { author_name: string }; Returns: string }
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
          sign_in_count: number
          user_id: string
        }[]
      }
      get_edge_function_url: {
        Args: { function_name: string }
        Returns: string
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
          p_include_test_users?: boolean
          p_limit?: number
          p_offset?: number
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
      get_unread_notification_count: { Args: never; Returns: number }
      get_user_favourites: {
        Args: { p_user_id: string }
        Returns: {
          isbn13: string
          position: number
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
      mark_notifications_read: { Args: never; Returns: undefined }
      normalise_for_grouping: { Args: { val: string }; Returns: string }
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
      remove_friend: { Args: { p_friend_id: string }; Returns: undefined }
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
    }
    Enums: {
      news_post_type_t:
        | "featured_review"
        | "release_notes_app"
        | "release_notes_website"
        | "article"
        | "announcement"
        | "book_spotlight"
        | "book_list"
      news_post_status_t: "draft" | "published"
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
      news_post_type_t: [
        "featured_review",
        "release_notes_app",
        "release_notes_website",
        "article",
        "announcement",
        "book_spotlight",
        "book_list",
      ],
      news_post_status_t: ["draft", "published"],
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

