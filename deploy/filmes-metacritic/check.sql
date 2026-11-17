-- 1. One matched title and how it was recorded (the most popular one with a score).
SELECT id, show_type, title, original_title, release_year, first_air_year,
       metacritic_score, metacritic_url, metacritic_checked_at
FROM public.filmes_shows
WHERE metacritic_score IS NOT NULL
ORDER BY tmdb_popularity DESC NULLS LAST
LIMIT 1;

-- 2. A specific title by name.
-- SELECT title, release_year, metacritic_score, metacritic_url, metacritic_checked_at
-- FROM public.filmes_shows WHERE title ILIKE 'the godfather%';

-- 3. Totals: matched, checked with no match (or "tbd" on the site), not checked yet.
SELECT count(*) FILTER (WHERE metacritic_score IS NOT NULL)                          AS with_score,
       count(*) FILTER (WHERE metacritic_url IS NOT NULL AND metacritic_score IS NULL) AS matched_no_score,
       count(*) FILTER (WHERE metacritic_checked_at IS NOT NULL AND metacritic_url IS NULL) AS no_match,
       count(*) FILTER (WHERE metacritic_checked_at IS NULL)                         AS not_checked
FROM public.filmes_shows;

-- 4. Titles with no match, to look at by hand.
SELECT id, show_type, title, original_title, coalesce(release_year, first_air_year) AS year
FROM public.filmes_shows
WHERE metacritic_checked_at IS NOT NULL AND metacritic_url IS NULL
ORDER BY tmdb_popularity DESC NULLS LAST
LIMIT 50;
