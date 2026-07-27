export type VoteValue = "yes" | "no";

export type Member = {
  id: string;
  name: string;
  created_at: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
  added_by_member_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SongVote = {
  song_id: string;
  member_id: string;
  vote: VoteValue;
  created_at: string;
  updated_at: string;
};

export type Poll = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type PollSong = {
  id: string;
  poll_id: string;
  song_id: string;
  position: number;
  created_at: string;
};

export type PollScore = {
  poll_id: string;
  song_id: string;
  member_id: string;
  score: number;
  created_at: string;
  updated_at: string;
};

export type ChosenSong = {
  id: string;
  song_id: string;
  note: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type AppState = {
  authenticated: boolean;
  selectedMemberId: string | null;
  members: Member[];
  songs: Array<
    Song & {
      added_by_name: string | null;
      yes_count: number;
      no_count: number;
      current_member_vote: VoteValue | null;
      is_chosen: boolean;
    }
  >;
  polls: Array<
    Poll & {
      songs: Array<{
        poll_song_id: string;
        song: Song;
        average_score: number | null;
        score_count: number;
        current_member_score: number | null;
      }>;
    }
  >;
  chosenSongs: Array<ChosenSong & { song: Song }>;
};
