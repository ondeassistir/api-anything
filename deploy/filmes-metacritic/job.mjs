// Fills filmes_shows.metacritic_score / metacritic_url for the titles never checked, then the oldest
// checked (migration 013 in the filmes repo). One Metacritic search per title.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Optional: BATCH (default 500), PAGE_DELAY_MS (2000),
// RECHECK_DAYS (30).
import { call, shutdown } from "../../dist/index.js";
import { pickResult, scoreOf } from "./match.mjs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
const batch = Number(process.env.BATCH ?? 500);
const delay = Number(process.env.PAGE_DELAY_MS ?? 2000);
const recheck = Number(process.env.RECHECK_DAYS ?? 30);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sb = (path, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });

const cutoff = new Date(Date.now() - recheck * 864e5).toISOString();
const res = await sb(
  `filmes_shows?select=id,show_type,title,original_title,release_year,first_air_year` +
    `&or=(metacritic_checked_at.is.null,metacritic_checked_at.lt.${cutoff})` +
    `&title=not.is.null&order=metacritic_checked_at.asc.nullsfirst,tmdb_popularity.desc.nullslast&limit=${batch}`,
);
if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
const shows = await res.json();
console.log(`${shows.length} titles to check`);

async function search(q) {
  for (let attempt = 1; ; attempt++) {
    const r = await call("metacritic", "search", { q });
    if (r.ok) return r.data;
    // a block or rate limit won't clear by retrying: stop, and leave the rest unchecked
    if (r.class === "rate" || r.class === "blocked" || attempt === 3) throw new Error(`${q}: ${r.class}: ${r.reason}`);
    await sleep(5000 * attempt);
  }
}

let matched = 0;
let done = 0;
try {
  for (const show of shows) {
    let hit = pickResult(show, await search(show.title));
    if (!hit && show.original_title && show.original_title !== show.title) {
      await sleep(delay);
      hit = pickResult(show, await search(show.original_title));
    }
    // checked even with no match, so the next run moves on to other titles
    const patch = await sb(`filmes_shows?id=eq.${encodeURIComponent(show.id)}`, {
      method: "PATCH",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({
        metacritic_score: scoreOf(hit),
        metacritic_url: hit?.url ?? null,
        metacritic_checked_at: new Date().toISOString(),
      }),
    });
    if (!patch.ok) throw new Error(`supabase ${patch.status}: ${await patch.text()}`);
    done++;
    if (hit) matched++;
    if (done % 50 === 0) console.log(`${done}/${shows.length} checked, ${matched} matched`);
    await sleep(delay);
  }
} finally {
  await shutdown();
  console.log(`checked ${done}, matched ${matched}`);
}
