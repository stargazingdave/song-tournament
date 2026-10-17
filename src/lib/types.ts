export type VoteValue = "yes" | "no";
export type AppProfile = { user_id: string; display_name: string; settings: Record<string, unknown> };
export type Band = { id: string; name: string; owner_user_id: string; requires_legacy_import: boolean; membership_status: "active" | "migration_required" | "pending" | "rejected" | "removed" };
export type BandPerson = { user_id: string; display_name: string; state: "active" | "migration_required"; can_manage_others_songs: boolean; can_manage_others_polls: boolean; can_manage_sets: boolean };
export type JoinRequest = { user_id: string; display_name: string; requested_at: string };
export type LegacyOption = { id: string; name: string };
export type Song = {
  id: string; band_id: string; title: string; artist: string | null;
  youtube_url: string | null; youtube_video_id: string | null;
  added_by_user_id: string | null; added_by_name_snapshot: string | null;
  created_at: string; updated_at: string;
};
export type SongVote = { song_id: string; user_id: string | null; vote: VoteValue };
export type Poll = { id: string; created_by_user_id: string | null; title: string; created_at: string; updated_at: string };
export type PollSong = { id: string; poll_id: string; song_id: string; position: number; created_at: string };
export type PollScore = { poll_id: string; song_id: string; user_id: string | null; score: number };
export type SetSong = { id: string; song_id: string; note: string | null; position: number; created_at: string; updated_at: string };
export type AppState = {
  authenticated: boolean; profile: AppProfile | null; suggestedDisplayName: string;
  bands: Band[]; selectedBandId: string | null; people: BandPerson[];
  joinRequests: JoinRequest[]; bandCode: string | null; legacyOptions: LegacyOption[];
  sets: Array<{id: string; name: string}>; selectedSetId: string | null; canManageSets: boolean;
  songs: Array<Song & { can_manage: boolean; added_by_name: string | null; yes_count: number; no_count: number; current_user_vote: VoteValue | null; is_in_set: boolean }>;
  polls: Array<Poll & { can_manage: boolean; songs: Array<{ poll_song_id: string; song: Song; average_score: number | null; score_count: number; current_user_score: number | null }> }>;
  setSongs: Array<SetSong & { song: Song }>;
};
