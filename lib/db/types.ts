/**
 * Sport Mode DB types (match Supabase schema).
 */

export type Sport = {
  id: string;
  slug: string;
  name: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  description?: string | null;
  popularity_tier?: number;
};

export type SportQuality = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  quality_group: string;
  is_active: boolean;
  sort_order: number;
};

export type SportQualityMapRow = {
  sport_id: string;
  quality_id: string;
  relevance: number; // 1-3
};

export type UserSportProfile = {
  id: string;
  user_id: string;
  sport_id: string | null;
  season_phase: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UserSportProfileQuality = {
  user_sport_profile_id: string;
  quality_id: string;
  priority: number; // 1-3
};

export type SportEvent = {
  id: string;
  user_id: string;
  sport_id: string | null;
  name: string;
  event_date: string; // ISO date
  importance: string;
  created_at: string;
  updated_at: string;
};

export type SportWithCategory = Sport & { category_label?: string };

export type SportCategory = {
  category: string;
  sports: Sport[];
};
