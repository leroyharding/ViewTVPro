import type { TMDBItem, TMDBDetail, TMDBEpisode } from '../types';

const API_KEY = '8711e2c6b0504a3277a840e1dde5ed86';
const BASE = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p/w500';
export const IMG_ORIGINAL = 'https://image.tmdb.org/t/p/original';

async function fetchTMDB<T>(endpoint: string): Promise<T> {
  const sep = endpoint.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${endpoint}${sep}api_key=${API_KEY}`);
  if (!res.ok) throw new Error(`TMDB Error: ${res.status}`);
  return res.json();
}

export async function getTrending(type: 'movie' | 'tv', page = 1): Promise<{ results: TMDBItem[]; total_pages: number }> {
  return fetchTMDB(`/trending/${type}/week?page=${page}`);
}

export async function searchMulti(query: string, page = 1): Promise<{ results: TMDBItem[]; total_pages: number }> {
  return fetchTMDB(`/search/multi?query=${encodeURIComponent(query)}&page=${page}`);
}

export async function getDetail(type: 'movie' | 'tv', id: number): Promise<TMDBDetail> {
  return fetchTMDB(`/${type}/${id}?append_to_response=external_ids,videos`);
}

export async function getSeasonEpisodes(tvId: number, season: number): Promise<{ episodes: TMDBEpisode[] }> {
  return fetchTMDB(`/tv/${tvId}/season/${season}`);
}

export async function discoverContent(
  type: 'movie' | 'tv',
  params: { genre?: number; year?: number; provider?: number; page?: number }
): Promise<{ results: TMDBItem[]; total_pages: number }> {
  let endpoint = `/discover/${type}?sort_by=popularity.desc`;
  if (params.genre) endpoint += `&with_genres=${params.genre}`;
  if (params.year) {
    endpoint += type === 'movie' ? `&primary_release_year=${params.year}` : `&first_air_date_year=${params.year}`;
  }
  if (params.provider) endpoint += `&with_watch_providers=${params.provider}&watch_region=US`;
  if (params.page) endpoint += `&page=${params.page}`;
  return fetchTMDB(endpoint);
}

export function getTitle(item: TMDBItem): string {
  return item.title || item.name || 'Unknown';
}

export function getYear(item: TMDBItem): string {
  const d = item.release_date || item.first_air_date;
  return d ? d.substring(0, 4) : '';
}

export function getMediaType(item: TMDBItem): 'movie' | 'tv' {
  if (item.media_type === 'tv') return 'tv';
  if (item.media_type === 'movie') return 'movie';
  if (item.first_air_date || item.name) return 'tv';
  return 'movie';
}

export async function getRecommendations(type: 'movie' | 'tv', id: number): Promise<{ results: TMDBItem[] }> {
  return fetchTMDB(`/${type}/${id}/recommendations`);
}

/** Fetch an official TMDB collection (e.g. Star Wars, James Bond) */
export async function getCollection(collectionId: number): Promise<{ id: number; name: string; overview: string; poster_path: string | null; backdrop_path: string | null; parts: TMDBItem[] }> {
  return fetchTMDB(`/collection/${collectionId}`);
}

/** Discover with raw query string params (for keyword-based collections) */
export async function discoverRaw(type: 'movie' | 'tv', rawParams: string): Promise<{ results: TMDBItem[]; total_pages: number }> {
  return fetchTMDB(`/discover/${type}?${rawParams.replace(/^&/, '')}`);
}

/** Get movies directed by a person */
export async function getPersonMovies(personId: number): Promise<{ cast: TMDBItem[]; crew: TMDBItem[] }> {
  return fetchTMDB(`/person/${personId}/movie_credits`);
}

/** Get person details (name, profile image, etc.) */
export async function getPersonDetail(personId: number): Promise<{ id: number; name: string; profile_path: string | null; biography: string }> {
  return fetchTMDB(`/person/${personId}`);
}

/** Find movie or TV show by IMDb ID */
export async function findByImdbId(imdbId: string): Promise<TMDBItem | null> {
  const data = await fetchTMDB<{
    movie_results: TMDBItem[];
    tv_results: TMDBItem[];
  }>(`/find/${imdbId}?external_source=imdb_id`);

  if (data.movie_results && data.movie_results.length > 0) {
    return { ...data.movie_results[0], media_type: 'movie' };
  }
  if (data.tv_results && data.tv_results.length > 0) {
    return { ...data.tv_results[0], media_type: 'tv' };
  }
  return null;
}
