export interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type?: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  popularity: number;
}

export interface TMDBDetail extends TMDBItem {
  runtime?: number;
  number_of_seasons?: number;
  seasons?: TMDBSeason[];
  imdb_id?: string;
  tagline?: string;
  status?: string;
  external_ids?: { imdb_id: string };
  videos?: { results: TMDBVideo[] };
  belongs_to_collection?: { id: number; name: string; poster_path: string };
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime?: number;
  vote_average: number;
}

export interface TMDBVideo {
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface StreamResult {
  name: string;
  title: string;
  url: string;
  source: string;
  quality: string;
  audioType: 'hd' | 'stereo' | 'unknown';
  audioLabel: string;
  streamType: 'rd' | 'hd' | 'free';
  sortWeight: number;
  behaviorHints?: Record<string, unknown>;
}

export interface IPTVChannel {
  name: string;
  url: string;
  logo: string;
  group: string;
}

export type ViewState = 'home' | 'detail' | 'player' | 'settings' | 'iptv' | 'discover' | 'streams' | 'collections';

export interface AppSettings {
  rdToken: string;
  rdManualKey: string;
  iptvUrl: string;
  iptvType: 'm3u' | 'xtream';
  xtreamHost: string;
  xtreamUser: string;
  xtreamPass: string;
  preferredPlayer: 'web' | 'vlc' | 'mx' | 'just' | 'default';
}

export const GENRES_MOVIE: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Sci-Fi', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

export const GENRES_TV: Record<number, string> = {
  10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids',
  9648: 'Mystery', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
  10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics', 37: 'Western'
};
