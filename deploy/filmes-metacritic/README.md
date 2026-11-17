# filmes -> Metacritic scores

Fills `filmes_shows.metacritic_score`, `metacritic_url` and `metacritic_checked_at` (migration
`013_metacritic_scores.sql` in the filmes repo; run it first).

A run takes up to `BATCH` titles (default 500): never checked first, then the oldest checked, then the
most popular. It searches Metacritic once per title (a second time with `original_title` on a miss),
about 2 s apart, and keeps a result only when type, title and year (+/-1) agree. No match leaves the
score null but still sets `metacritic_checked_at`, so the run moves on. Titles are checked again
after `RECHECK_DAYS` (30). A block or rate limit stops the run and leaves the rest unchecked.

Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Run with `node deploy/filmes-metacritic/job.mjs`;
on Coolify, reuse `deploy/metacritic-weekly/Dockerfile` and add this as a scheduled task.

**Email report.** With `RESEND_API_KEY`, `EMAIL_FROM` and `EMAIL_TO` set (the filmes cron's names; several
recipients with commas), each run emails its counts and a table of the titles with no match (up to 1000
rows), also when the run stopped early. Without `RESEND_API_KEY` nothing is sent; a failed email never
fails the job.

`check.sql` has queries to look at a matched title, the totals, and the unmatched titles.
