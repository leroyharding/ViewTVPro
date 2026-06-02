export interface HydraCollection {
  id: string;
  title: string;
  emoji: string;
  type: 'tmdb_collection' | 'discover_movie' | 'discover_tv' | 'person_movies' | 'stremio_catalog';
  tmdbCollectionId?: number;
  discoverParams?: string;
  personId?: number;
  stremioId?: string;
}

export const HYDRA_COLLECTIONS: HydraCollection[] = [
  { id: 'netflix', title: 'Netflix Catalog', emoji: '🔴', type: 'stremio_catalog', stremioId: 'nfx' },
  { id: 'hbo', title: 'HBO Max Catalog', emoji: '🟣', type: 'stremio_catalog', stremioId: 'hbm' },
  { id: 'disney', title: 'Disney+ Catalog', emoji: '🏰', type: 'stremio_catalog', stremioId: 'dnp' },
  { id: 'prime', title: 'Prime Video Catalog', emoji: '🔵', type: 'stremio_catalog', stremioId: 'amp' },
  { id: 'apple', title: 'Apple TV+ Catalog', emoji: '🍎', type: 'stremio_catalog', stremioId: 'atp' },
  { id: 'mcu', title: 'Marvel Cinematic Universe', emoji: '🦸', type: 'discover_movie', discoverParams: '&with_keywords=180547&sort_by=release_date.asc' },
  { id: 'dc', title: 'DC Universe Films', emoji: '🦇', type: 'discover_movie', discoverParams: '&with_companies=429|9993|128064|184898|165407&sort_by=popularity.desc' },
  { id: 'star-wars', title: 'Star Wars Saga', emoji: '⚔️', type: 'tmdb_collection', tmdbCollectionId: 10 },
  { id: 'james-bond', title: 'James Bond 007', emoji: '🔫', type: 'tmdb_collection', tmdbCollectionId: 645 },
  { id: 'harry-potter', title: 'Harry Potter', emoji: '🧙', type: 'tmdb_collection', tmdbCollectionId: 1241 },
  { id: 'lord-of-rings', title: 'Lord of the Rings', emoji: '💍', type: 'tmdb_collection', tmdbCollectionId: 119 },
  { id: 'hobbit', title: 'The Hobbit Trilogy', emoji: '🧝', type: 'tmdb_collection', tmdbCollectionId: 121938 },
  { id: 'fast-furious', title: 'Fast & Furious', emoji: '🚗', type: 'tmdb_collection', tmdbCollectionId: 9485 },
  { id: 'mission-impossible', title: 'Mission: Impossible', emoji: '💣', type: 'tmdb_collection', tmdbCollectionId: 87359 },
  { id: 'john-wick', title: 'John Wick', emoji: '🐶', type: 'tmdb_collection', tmdbCollectionId: 404609 },
  { id: 'matrix', title: 'The Matrix', emoji: '🕶️', type: 'tmdb_collection', tmdbCollectionId: 2344 },
  { id: 'jurassic-park', title: 'Jurassic Park', emoji: '🦕', type: 'tmdb_collection', tmdbCollectionId: 328 },
  { id: 'pirates-caribbean', title: 'Pirates of the Caribbean', emoji: '🏴‍☠️', type: 'tmdb_collection', tmdbCollectionId: 295 },
  { id: 'indiana-jones', title: 'Indiana Jones', emoji: '🎩', type: 'tmdb_collection', tmdbCollectionId: 84 },
  { id: 'back-to-future', title: 'Back to the Future', emoji: '⚡', type: 'tmdb_collection', tmdbCollectionId: 264 },
  { id: 'terminator', title: 'Terminator', emoji: '🤖', type: 'tmdb_collection', tmdbCollectionId: 534 },
  { id: 'alien', title: 'Alien / Aliens', emoji: '👾', type: 'tmdb_collection', tmdbCollectionId: 8091 },
  { id: 'predator', title: 'Predator', emoji: '🌿', type: 'tmdb_collection', tmdbCollectionId: 399 },
  { id: 'rocky', title: 'Rocky & Creed', emoji: '🥊', type: 'tmdb_collection', tmdbCollectionId: 1575 },
  { id: 'nolan', title: 'Christopher Nolan Films', emoji: '🎞️', type: 'person_movies', personId: 525 },
  { id: 'tarantino', title: 'Quentin Tarantino Films', emoji: '🩸', type: 'person_movies', personId: 138 },
  { id: 'scorsese', title: 'Martin Scorsese Films', emoji: '🎬', type: 'person_movies', personId: 1032 },
  { id: 'oscar-winners', title: 'Oscar Winners', emoji: '🏆', type: 'discover_movie', discoverParams: '&with_keywords=311771|370793|337571|329733|366928|353465&sort_by=vote_average.desc&vote_count.gte=500' },
  { id: 'top-tv', title: 'Highest Rated TV Shows', emoji: '📺', type: 'discover_tv', discoverParams: '&sort_by=vote_average.desc&vote_count.gte=1000' },
];
