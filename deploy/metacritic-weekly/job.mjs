// Weekly job: every Metacritic movie on a streaming service -> a Supabase table.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Optional: MAX_PAGES (default 300), PAGE_DELAY_MS (default 2000).
import { call, shutdown } from "../../dist/index.js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
const maxPages = Number(process.env.MAX_PAGES ?? 300);
const delay = Number(process.env.PAGE_DELAY_MS ?? 2000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function page(n) {
  for (let attempt = 1; ; attempt++) {
    const r = await call("metacritic", "streamingMovies", { page: n });
    if (r.ok) return r.data;
    if (attempt === 3) throw new Error(`page ${n}: ${r.class}: ${r.reason}`);
    await sleep(5000 * attempt);
  }
}

// Collect everything first: a failure on page 40 must not leave a half-updated table.
const byUrl = new Map();
try {
  for (let n = 1; n <= maxPages; n++) {
    const items = await page(n);
    if (!items.length) break;
    for (const m of items) if (m.url) byUrl.set(m.url, m);
    console.log(`page ${n}: ${items.length} (total ${byUrl.size})`);
    await sleep(delay);
  }
} finally {
  await shutdown();
}
if (byUrl.size === 0) throw new Error("no movies found: the site or its markup changed");

const now = new Date().toISOString();
const rows = [...byUrl.values()].map((m) => ({
  url: m.url,
  name: m.name,
  metascore: Number.parseInt(m.metascore, 10) || null, // "tbd" -> null
  channels: m.channels ?? [],
  scraped_at: now,
}));

for (let i = 0; i < rows.length; i += 500) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/metacritic_movies?on_conflict=url`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows.slice(i, i + 500)),
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
}
console.log(`saved ${rows.length} movies`);
