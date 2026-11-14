# Metacritic weekly -> Supabase

1. Run `supabase.sql` in the Supabase SQL editor.
2. Coolify: new resource -> this repository, build pack Dockerfile, base directory `/`,
   Dockerfile location `/deploy/metacritic-weekly/Dockerfile`, no port, no domain.
3. Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (runtime only).
4. Scheduled task: command `node deploy/metacritic-weekly/job.mjs`, frequency `0 6 * * 1`
   (Mondays 06:00), container = the app.

A run fetches every page (about 2 s apart), then upserts by `url`, so reruns update rows in place
and nothing is written if a page fails. Metacritic may refuse a datacenter IP; the job then
fails loudly with the reason in the task's logs.
