import { EpisodeIds, MovieIds, Season, ShowIds } from 'trakt.tv';

export interface WatchedShow extends Show {
  watchedEpisodes: number;
  isNewShow: boolean;
  firstSeason: number;
  lastSeason: number;
  episodes: (Episode & { watched_at: string })[];
}

export interface WatchedMovie extends Movie {
  watchedAt: string;
}

// --- Traks.tv API ---

export interface Movie {
  title?: string;
  year?: number;
  ids: MovieIds;
}

export interface Show {
  title?: string;
  year?: number;
  ids: ShowIds;
}

export interface Episode {
  title: string;
  season: number;
  number: number;
  ids: EpisodeIds;
}

export interface HistoryEntry {
  id: number;
  watched_at: string;
  action: string;
  type: string;
}

export interface MovieHistoryEntry extends HistoryEntry {
  movie: Movie;
}

export interface ShowHistoryEntry extends HistoryEntry {
  episode: Episode;
  show: Show;
}

export interface TraktAddToListResponse {
  added: { movies: number; shows: number; seasons: number; episodes: number; people: number };
  existing: { movies: number; shows: number; seasons: number; episodes: number; people: number };
  not_found: { movies: Movie[]; shows: Show[]; seasons: Season[]; episodes: Episode[] };
}
