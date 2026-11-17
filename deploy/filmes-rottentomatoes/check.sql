-- 1. One matched title and how it was recorded (the most popular one with a Tomatometer).
SELECT id, show_type, title, release_year, first_air_year,
       rt_tomatometer, rt_popcornmeter, rt_url, rt_checked_at
FROM public.filmes_shows
WHERE rt_tomatometer IS NOT NULL
ORDER BY tmdb_popularity DESC NULLS LAST
LIMIT 1;

-- 2. Totals: with a Tomatometer, matched with no score yet, no match, not checked yet.
SELECT count(*) FILTER (WHERE rt_tomatometer IS NOT NULL)                              AS with_tomatometer,
       count(*) FILTER (WHERE rt_url IS NOT NULL AND rt_tomatometer IS NULL)           AS matched_no_score,
       count(*) FILTER (WHERE rt_checked_at IS NOT NULL AND rt_url IS NULL)            AS no_match,
       count(*) FILTER (WHERE rt_checked_at IS NULL)                                   AS not_checked
FROM public.filmes_shows;

-- 3. Titles with no match, to look at by hand.
SELECT id, show_type, title, original_title, coalesce(release_year, first_air_year) AS year
FROM public.filmes_shows
WHERE rt_checked_at IS NOT NULL AND rt_url IS NULL
ORDER BY tmdb_popularity DESC NULLS LAST
LIMIT 50;

-- 4. Retry the unmatched ones on the next run (after a matching change); matched rows are untouched.
-- UPDATE public.filmes_shows SET rt_checked_at = NULL WHERE rt_checked_at IS NOT NULL AND rt_url IS NULL;
