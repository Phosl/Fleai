export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamps = { created_at: string; updated_at: string };
type MutableTimestamps = { created_at?: string; updated_at?: string };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Timestamps & {
          id: string;
          display_name: string;
          avatar_path: string | null;
          bio: string | null;
          hunting_limit_override: number | null;
          shop_limit_override: number | null;
          is_super_admin: boolean;
          suspended_at: string | null;
          suspension_reason: string | null;
        };
        Insert: MutableTimestamps & {
          id: string;
          display_name?: string;
          avatar_path?: string | null;
          bio?: string | null;
          hunting_limit_override?: number | null;
          shop_limit_override?: number | null;
          is_super_admin?: boolean;
          suspended_at?: string | null;
          suspension_reason?: string | null;
        };
        Update: MutableTimestamps & Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      shops: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          slug: string;
          name: string;
          description: string | null;
          logo_path: string | null;
          is_published: boolean;
        };
        Insert: MutableTimestamps & {
          id?: string;
          owner_id: string;
          slug: string;
          name: string;
          description?: string | null;
          logo_path?: string | null;
          is_published?: boolean;
        };
        Update: MutableTimestamps & Partial<Database["public"]["Tables"]["shops"]["Insert"]>;
        Relationships: [];
      };
      items: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          shop_id: string | null;
          source_item_id: string | null;
          slug: string;
          title: string;
          description: string;
          category: Database["public"]["Enums"]["item_category"];
          status: Database["public"]["Enums"]["item_status"];
          moderation_status: Database["public"]["Enums"]["moderation_status"];
          brand: string | null;
          condition: string | null;
          defects: string[];
          attributes: Json;
          price_cents: number | null;
          currency: string;
          asking_price_cents: number | null;
          extra_costs_cents: number;
          selected_report_id: string | null;
          idempotency_key: string | null;
          published_at: string | null;
        };
        Insert: MutableTimestamps & {
          id?: string;
          owner_id: string;
          shop_id?: string | null;
          source_item_id?: string | null;
          slug: string;
          title?: string;
          description?: string;
          category: Database["public"]["Enums"]["item_category"];
          status?: Database["public"]["Enums"]["item_status"];
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          brand?: string | null;
          condition?: string | null;
          defects?: string[];
          attributes?: Json;
          price_cents?: number | null;
          currency?: string;
          asking_price_cents?: number | null;
          extra_costs_cents?: number;
          selected_report_id?: string | null;
          idempotency_key?: string | null;
          published_at?: string | null;
        };
        Update: MutableTimestamps & Partial<Database["public"]["Tables"]["items"]["Insert"]>;
        Relationships: [];
      };
      media_assets: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          item_id: string;
          kind: Database["public"]["Enums"]["media_asset_kind"];
          bucket_id: string;
          storage_path: string;
          mime_type: string;
          width: number | null;
          height: number | null;
          byte_size: number | null;
          alt_text: string;
          sort_order: number;
          is_approved: boolean;
          ai_generated: boolean;
          source_asset_id: string | null;
          idempotency_key: string | null;
        };
        Insert: MutableTimestamps & {
          id?: string;
          owner_id: string;
          item_id: string;
          kind: Database["public"]["Enums"]["media_asset_kind"];
          bucket_id: string;
          storage_path: string;
          mime_type: string;
          width?: number | null;
          height?: number | null;
          byte_size?: number | null;
          alt_text?: string;
          sort_order?: number;
          is_approved?: boolean;
          ai_generated?: boolean;
          source_asset_id?: string | null;
          idempotency_key?: string | null;
        };
        Update: MutableTimestamps & Partial<Database["public"]["Tables"]["media_assets"]["Insert"]>;
        Relationships: [];
      };
      analysis_runs: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          item_id: string;
          kind: Database["public"]["Enums"]["ai_run_kind"];
          status: Database["public"]["Enums"]["ai_run_status"];
          progress: number;
          idempotency_key: string;
          provider_request_id: string | null;
          input: Json;
          result: Json | null;
          error_code: string | null;
          attempt_count: number;
          completed_at: string | null;
        };
        Insert: MutableTimestamps & {
          id?: string;
          owner_id: string;
          item_id: string;
          kind: Database["public"]["Enums"]["ai_run_kind"];
          status?: Database["public"]["Enums"]["ai_run_status"];
          progress?: number;
          idempotency_key: string;
          provider_request_id?: string | null;
          input?: Json;
          result?: Json | null;
          error_code?: string | null;
          attempt_count?: number;
          completed_at?: string | null;
        };
        Update: MutableTimestamps & Partial<Database["public"]["Tables"]["analysis_runs"]["Insert"]>;
        Relationships: [];
      };
      hunting_reports: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          item_id: string;
          run_id: string;
          report: Json;
          confidence_score: number;
          recommendation: string;
        };
        Insert: MutableTimestamps & {
          id?: string;
          owner_id: string;
          item_id: string;
          run_id: string;
          report: Json;
          confidence_score: number;
          recommendation: string;
        };
        Update: MutableTimestamps & Partial<Database["public"]["Tables"]["hunting_reports"]["Insert"]>;
        Relationships: [];
      };
      comparables: {
        Row: Timestamps & {
          id: string;
          report_id: string;
          title: string;
          url: string;
          source_name: string;
          price_cents: number | null;
          currency: string;
          price_type: Database["public"]["Enums"]["comparable_price_type"];
          condition: string | null;
          similarity: number;
          observed_at: string;
        };
        Insert: MutableTimestamps & Omit<Database["public"]["Tables"]["comparables"]["Row"], keyof Timestamps | "id"> & { id?: string };
        Update: MutableTimestamps & Partial<Database["public"]["Tables"]["comparables"]["Insert"]>;
        Relationships: [];
      };
      social_packs: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          item_id: string;
          run_id: string | null;
          status: Database["public"]["Enums"]["ai_run_status"];
          instagram_caption: string;
          tiktok_caption: string;
          hashtags: string[];
          render_provider_id: string | null;
          error_code: string | null;
        };
        Insert: MutableTimestamps & {
          id?: string;
          owner_id: string;
          item_id: string;
          run_id?: string | null;
          status?: Database["public"]["Enums"]["ai_run_status"];
          instagram_caption?: string;
          tiktok_caption?: string;
          hashtags?: string[];
          render_provider_id?: string | null;
          error_code?: string | null;
        };
        Update: MutableTimestamps & Partial<Database["public"]["Tables"]["social_packs"]["Insert"]>;
        Relationships: [];
      };
      inquiries: {
        Row: Timestamps & {
          id: string;
          listing_id: string;
          seller_id: string;
          buyer_name: string;
          buyer_email: string;
          message: string;
          status: Database["public"]["Enums"]["inquiry_status"];
          notification_status: string;
          closed_at: string | null;
          idempotency_key: string;
        };
        Insert: MutableTimestamps & {
          id?: string;
          listing_id: string;
          seller_id: string;
          buyer_name: string;
          buyer_email: string;
          message: string;
          status?: Database["public"]["Enums"]["inquiry_status"];
          notification_status?: string;
          closed_at?: string | null;
          idempotency_key: string;
        };
        Update: MutableTimestamps & Partial<Database["public"]["Tables"]["inquiries"]["Insert"]>;
        Relationships: [];
      };
      usage_events: {
        Row: {
          id: string;
          owner_id: string;
          run_id: string | null;
          operation: string;
          units: number;
          provider: string | null;
          provider_request_id: string | null;
          occurred_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["usage_events"]["Row"]> & {
          owner_id: string;
          operation: string;
        };
        Update: Partial<Database["public"]["Tables"]["usage_events"]["Insert"]>;
        Relationships: [];
      };
      listing_reports: {
        Row: Timestamps & {
          id: string;
          listing_id: string;
          reason: string;
          details: string | null;
          reporter_email: string | null;
          status: string;
        };
        Insert: MutableTimestamps & {
          id?: string;
          listing_id: string;
          reason: string;
          details?: string | null;
          reporter_email?: string | null;
          status?: string;
        };
        Update: MutableTimestamps & Partial<Database["public"]["Tables"]["listing_reports"]["Insert"]>;
        Relationships: [];
      };
      webhook_events: {
        Row: { id: string; provider: string; event_id: string; received_at: string };
        Insert: { id?: string; provider: string; event_id: string; received_at?: string };
        Update: never;
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_type: "user" | "item";
          target_id: string;
          reason: string;
          before_data: Json;
          after_data: Json;
          idempotency_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_type: "user" | "item";
          target_id: string;
          reason: string;
          before_data?: Json;
          after_data?: Json;
          idempotency_key: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_audit_logs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_inquiry: { Args: { inquiry_id: string }; Returns: undefined };
      enqueue_ai_run: { Args: { run_id: string }; Returns: number };
      is_suspended: { Args: { check_user_id?: string }; Returns: boolean };
      admin_list_users: {
        Args: { p_query?: string; p_status?: string; p_sort?: string; p_limit?: number; p_offset?: number };
        Returns: Array<{
          user_id: string;
          email: string;
          display_name: string;
          created_at: string;
          last_sign_in_at: string | null;
          providers: string[];
          suspended_at: string | null;
          suspension_reason: string | null;
          hunting_limit_override: number | null;
          shop_limit_override: number | null;
          item_count: number;
          hunting_used: number;
          shop_used: number;
          total_count: number;
        }>;
      };
      admin_list_items: {
        Args: {
          p_query?: string;
          p_owner_id?: string;
          p_status?: string;
          p_moderation?: string;
          p_category?: string;
          p_sort?: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Array<{
          item_id: string;
          owner_id: string;
          owner_email: string;
          owner_name: string;
          title: string;
          brand: string | null;
          category: Database["public"]["Enums"]["item_category"];
          status: Database["public"]["Enums"]["item_status"];
          moderation_status: Database["public"]["Enums"]["moderation_status"];
          price_cents: number | null;
          currency: string;
          created_at: string;
          published_at: string | null;
          media_count: number;
          run_count: number;
          total_count: number;
        }>;
      };
    };
    Enums: {
      item_category:
        | "fashion"
        | "home_design"
        | "electronics"
        | "collectibles"
        | "art_antiques"
        | "books_comics"
        | "music_instruments"
        | "toys_games"
        | "sports_outdoor"
        | "tools_diy"
        | "other";
      item_status: "draft" | "published" | "reserved" | "sold" | "archived";
      moderation_status: "pending" | "approved" | "blocked";
      ai_run_kind: "hunting_report" | "listing_draft" | "marketing_images" | "social_pack";
      ai_run_status:
        | "queued"
        | "moderating"
        | "inspecting"
        | "researching"
        | "synthesizing"
        | "generating"
        | "rendering"
        | "needs_input"
        | "completed"
        | "failed";
      media_asset_kind:
        | "real"
        | "clean_ai"
        | "context_ai"
        | "try_on_ai"
        | "social_still"
        | "social_video";
      comparable_price_type: "asking" | "sold" | "unknown";
      inquiry_status: "new" | "contacted" | "accepted" | "declined" | "closed";
    };
    CompositeTypes: Record<string, never>;
  };
};
