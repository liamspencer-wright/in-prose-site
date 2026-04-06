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
            referencedRelation: "book_stats_expanded"
            referencedColumns: ["isbn13"]
          },
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
            foreignKeyName: "activities_book_isbn13_fkey"
            columns: ["book_isbn13"]
            isOneToOne: false
            referencedRelation: "books_most_read"
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
            foreignKeyName: "activity_comments_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "book_stats_expanded"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "activity_comments_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "activity_comments_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books_expanded"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "activity_comments_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books_most_read"
            referencedColumns: ["isbn13"]
          },
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
        Relationships: [
          {
            foreignKeyName: "activity_reactions_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "book_stats_expanded"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "activity_reactions_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "activity_reactions_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books_expanded"
            referencedColumns: ["isbn13"]
          },
          {
            foreignKeyName: "activity_reactions_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books_most_read"
            referencedColumns: ["isbn13"]
          },
        ]
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
            referencedRelation: "book_stats_expanded"
            referencedColumns: ["isbn13"]
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
          {
            foreignKeyName: "book_authors_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books_most_read"
            referencedColumns: ["isbn13"]
          },
        ]
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
            referencedRelation: "book_stats_expanded"
            referencedColumns: ["isbn13"]
          },
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
            foreignKeyName: "book_subjects_isbn13_fkey"
            columns: ["isbn13"]
            isOneToOne: false
            referencedRelation: "books_most_read"
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
      profiles: {
        Row: {
          avatar_url: string | null
          badge_type: string | null
          created_at: string
          description: string | null
          display_name: string | null
          id: string
          is_admin: boolean
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
          created_at: string
          deadline_at: string | null
          goal: number
          id: string
          is_home_featured: boolean
          is_private: boolean
          kind: string
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
          created_at?: string
          deadline_at?: string | null
          goal: number
          id?: string
          is_home_featured?: boolean
          is_private?: boolean
          kind: string
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
          created_at?: string
          deadline_at?: string | null
          goal?: number
          id?: string
          is_home_featured?: boolean
          is_private?: boolean
          kind?: string
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
      user_books: {
        Row: {
          created_at: string
          finished_at: string | null
          isbn13: string
          ownership: Database["public"]["Enums"]["ownership_t"]
          rating: number | null
          review: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["read_status_t"]
          updated_at: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          isbn13: string
          ownership?: Database["public"]["Enums"]["ownership_t"]
          rating?: number | null
          review?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["read_status_t"]
          updated_at?: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          isbn13?: string
          ownership?: Database["public"]["Enums"]["ownership_t"]
          rating?: number | null
          review?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["read_status_t"]
          updated_at?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
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
    }
    Views: {
      book_stats_expanded: {
        Row: {
          avg_rating: number | null
          date_published: string | null
          image: string | null
          isbn13: string | null
          language: string | null
          num_reviews: number | null
          pages: number | null
          title: string | null
        }
        Relationships: []
      }
      books_expanded: {
        Row: {
          authors: string[] | null
          community_rating: number | null
          date_published: string | null
          first_author_name: string | null
          genres: string[] | null
          image: string | null
          image_original: string | null
          isbn13: string | null
          language: string | null
          pages: number | null
          pub_year: number | null
          publisher: string | null
          ratings_count: number | null
          subtitle: string | null
          synopsis: string | null
          title: string | null
        }
        Relationships: []
      }
      books_most_read: {
        Row: {
          authors: string[] | null
          date_published: string | null
          finished_users: number | null
          first_author_name: string | null
          genres: string[] | null
          image: string | null
          image_original: string | null
          isbn13: string | null
          language: string | null
          pages: number | null
          pub_year: number | null
          publisher: string | null
          subtitle: string | null
          synopsis: string | null
          title: string | null
          users_with_book: number | null
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
          genres: string[] | null
          image_original: string | null
          isbn13: string | null
          language: string | null
          ownership: Database["public"]["Enums"]["ownership_t"] | null
          pages: number | null
          pub_year: number | null
          publisher: string | null
          rating: number | null
          review: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["read_status_t"] | null
          synopsis: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Relationships: []
      }
      user_books_expanded_all: {
        Row: {
          authors: string[] | null
          avg_rating: number | null
          cover_url: string | null
          created_at: string | null
          date_published: string | null
          finished_at: string | null
          first_author_name: string | null
          first_author_sort_name: string | null
          genres: string[] | null
          image_original: string | null
          isbn13: string | null
          language: string | null
          num_reviews: number | null
          ownership: Database["public"]["Enums"]["ownership_t"] | null
          pages: number | null
          pub_year: number | null
          publisher: string | null
          rating: number | null
          review: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["read_status_t"] | null
          synopsis: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Relationships: []
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
      check_username_available: { Args: { p_username: string }; Returns: Json }
      clear_user_favourite: { Args: { p_position: number }; Returns: undefined }
      compute_sort_name: { Args: { author_name: string }; Returns: string }
      create_friend_request: { Args: { target_user_id: string }; Returns: Json }
      delete_activity: {
        Args: { p_activity_type: string; p_isbn13: string }
        Returns: undefined
      }
      delete_activity_comment: {
        Args: { p_comment_id: string }
        Returns: boolean
      }
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
          p_limit?: number
          p_offset?: number
          p_user_id?: string
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
          status: string
          user_id: string
          username: string
        }[]
      }
      get_books_in_common: {
        Args: { friend_id: string }
        Returns: {
          all_author_names: string[]
          cover_url: string
          first_author_name: string
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
      get_friend_library: {
        Args: { friend_id: string }
        Returns: {
          authors: string[] | null
          avg_rating: number | null
          cover_url: string | null
          created_at: string | null
          date_published: string | null
          finished_at: string | null
          first_author_name: string | null
          first_author_sort_name: string | null
          genres: string[] | null
          image_original: string | null
          isbn13: string | null
          language: string | null
          num_reviews: number | null
          ownership: Database["public"]["Enums"]["ownership_t"] | null
          pages: number | null
          pub_year: number | null
          publisher: string | null
          rating: number | null
          review: string | null
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
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          mutual_friends: number
          reason: string
          shared_books: number
          user_id: string
          username: string
        }[]
      }
      get_friends_activity_feed: {
        Args: { p_activity_type?: string; p_limit?: number; p_offset?: number }
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
          status: string
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
      get_friends_with_book:
        | {
            Args: { p_exclude_user_id?: string; p_isbn13: string }
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
        | {
            Args: {
              p_exclude_user_id?: string
              p_isbn13: string
              p_limit?: number
              p_offset?: number
            }
            Returns: Json[]
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
      get_unread_notification_count: { Args: never; Returns: number }
      get_user_favourites: {
        Args: { p_user_id: string }
        Returns: {
          isbn13: string
          position: number
        }[]
      }
      is_username_reserved: { Args: { p_username: string }; Returns: boolean }
      is_valid_isbn10: { Args: { in_raw: string }; Returns: boolean }
      mark_notifications_read: { Args: never; Returns: undefined }
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
      respond_to_friend_request: {
        Args: { friendship_id: string; response: string }
        Returns: Json
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
        Args: { p_limit?: number; p_offset?: number; p_query: string }
        Returns: {
          avatar_url: string
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
      subjects_for_book: {
        Args: { isbn13_in: string }
        Returns: {
          name: string
        }[]
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
      ownership_t: "owned" | "borrowed" | "not_owned"
      read_status_t: "to_read" | "reading" | "finished" | "dnf"
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
      ownership_t: ["owned", "borrowed", "not_owned"],
      read_status_t: ["to_read", "reading", "finished", "dnf"],
    },
  },
} as const
