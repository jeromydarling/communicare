// Database types for the Supabase client.
//
// This is a hand-written subset covering only the tables we currently read
// from the app (waitlist, profiles, farms, farm_homepages). The full,
// always-up-to-date types should be regenerated whenever the schema changes:
//
//   supabase gen types typescript --local > lib/supabase/types.ts
//
// (Or `--linked` once a Supabase project is connected.)

import type { GeneratedHomepage } from "@/lib/homepage-schema";

export type FarmKind =
  | "vegetable_csa"
  | "raw_milk_herd_share"
  | "pastured_meat"
  | "pastured_eggs"
  | "mixed_farm"
  | "market_garden"
  | "orchard_fruit"
  | "flower_farm";

export interface Database {
  public: {
    Tables: {
      waitlist: {
        Row: {
          id: number;
          email: string;
          name: string | null;
          farm_name: string | null;
          location: string | null;
          farm_kind: FarmKind | null;
          current_tool: string | null;
          note: string | null;
          source: string | null;
          is_invited: boolean;
          invited_at: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          name?: string | null;
          farm_name?: string | null;
          location?: string | null;
          farm_kind?: FarmKind | null;
          current_tool?: string | null;
          note?: string | null;
          source?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["waitlist"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          preferred_sms: boolean;
          preferred_email: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          phone?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      farms: {
        Row: {
          id: string;
          slug: string;
          name: string;
          location: string;
          kind: FarmKind;
          tagline: string | null;
          founder_name: string | null;
          founder_bio: string | null;
          story: string | null;
          is_published: boolean;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          metadata: Record<string, unknown>;
          herdshare_state: string | null;
        };
        Insert: {
          slug: string;
          name: string;
          location: string;
          kind: FarmKind;
          tagline?: string | null;
          founder_name?: string | null;
          founder_bio?: string | null;
          story?: string | null;
          is_published?: boolean;
          herdshare_state?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["farms"]["Insert"]>;
        Relationships: [];
      };
      farm_homepages: {
        Row: {
          id: string;
          farm_id: string;
          content: GeneratedHomepage;
          version: number;
          is_published: boolean;
          published_at: string | null;
          generated_by: string;
          generation_input: Record<string, unknown> | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          farm_id: string;
          content: GeneratedHomepage;
          version: number;
          is_published?: boolean;
          generated_by?: string;
          generation_input?: Record<string, unknown> | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["farm_homepages"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      v_public_farms: {
        Row: {
          id: string;
          slug: string;
          name: string;
          location: string;
          kind: FarmKind;
          tagline: string | null;
          founder_name: string | null;
        };
        Relationships: [];
      };
    };
    // The canonical Supabase-generated shapes for empty maps. Don't
    // hand-write Functions/CompositeTypes; regenerate with the CLI when ready.
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      farm_kind: FarmKind;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
