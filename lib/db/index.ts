export { getSupabase, isDbConfigured } from "./client";
export type { Sport, SportCategory, SportQuality, UserSportProfile, SportEvent } from "./types";
export {
  getSportCategories,
  getSportsByCategory,
  getQualitiesForSport,
  upsertUserSportProfile,
  upsertSportEvent,
  getLatestUserSportProfile,
} from "./sportRepository";
export type { UpsertUserSportProfileParams, UpsertSportEventParams } from "./sportRepository";
