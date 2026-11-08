import type { AppState, AppProfile, Band } from "@/lib/types";
export const previewUser: AppProfile = {
  user_id: "11111111-1111-4111-8111-111111111111", display_name: "Alex Morgan", settings: {},
};
export const previewBand: Band = {
  id: "22222222-2222-4222-8222-222222222222", name: "The Midnight Satellites",
  owner_user_id: previewUser.user_id, requires_legacy_import: false, membership_status: "active",
};
export const previewState: AppState = {
  authenticated: true, profile: previewUser, suggestedDisplayName: previewUser.display_name,
  bands: [previewBand], selectedBandId: null, people: [], joinRequests: [], bandCode: null,
  legacyOptions: [], sets: [], selectedSetId: null, canManageSets: false,
  songs: [], polls: [], setSongs: [],
};
