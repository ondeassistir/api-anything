# filmes -> Rotten Tomatoes scores

Fills `filmes_shows.rt_tomatometer` (critics), `rt_popcornmeter` (audience), `rt_url` and `rt_checked_at`
(migration `014_rottentomatoes_scores.sql` in the filmes repo; run it first).

A run takes up to `BATCH` titles (default 300): never checked first, then the oldest checked, then the most
popular. Per title: a Rotten Tomatoes search (a second one with `original_title` on a miss), a result kept only
when type (movie `/m/`, show `/tv/`), title and year (+/-1, or exact with a subtitle) agree; for a match one
read of the title's own page, which holds both scores. Requests are `PAGE_DELAY_MS` (2 s) apart, so a run takes
about 3 requests x 2 s per matched title. Scores are percentages; null when the site shows `--`. A title with
no match still gets `rt_checked_at`. Rechecked after `RECHECK_DAYS` (30). A block or rate limit stops the run.

Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; the email of unmatched titles needs `RESEND_API_KEY`,
`EMAIL_FROM`, `EMAIL_TO`. Run `node deploy/filmes-rottentomatoes/job.mjs` (Coolify: a second scheduled task on
the same app, with a timeout of at least an hour). `check.sql` has queries to inspect the result.
