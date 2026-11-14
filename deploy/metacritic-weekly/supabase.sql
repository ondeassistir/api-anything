create table if not exists metacritic_movies (
  url        text primary key,
  name       text not null,
  metascore  int,
  channels   text[] not null default '{}',
  scraped_at timestamptz not null default now()
);
alter table metacritic_movies enable row level security; -- the service role key bypasses it
