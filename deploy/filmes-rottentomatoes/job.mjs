// Fills filmes_shows.rt_tomatometer / rt_popcornmeter / rt_url for the titles never checked, then the oldest
// checked (migration 014 in the filmes repo). Per title: one Rotten Tomatoes search, and for a match one
// read of the title's own page (it holds both scores; the search row has only the Tomatometer).
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Optional: BATCH (default 300), PAGE_DELAY_MS (2000),
// RECHECK_DAYS (30), and for the email RESEND_API_KEY, EMAIL_FROM, EMAIL_TO.
import { call, shutdown } from "../../dist/index.js";
import { pickResult } from "../filmes-metacritic/match.mjs";
import { sendReport } from "../filmes-metacritic/report.mjs";
import { adaptSearch, pct } from "./adapt.mjs";
import { probe } from "./probe.mjs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
const batch = Number(process.env.BATCH ?? 300);
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
    `&or=(rt_checked_at.is.null,rt_checked_at.lt.${cutoff})` +
    `&title=not.is.null&order=rt_checked_at.asc.nullsfirst,tmdb_popularity.desc.nullslast&limit=${batch}`,
);
if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
const shows = await res.json();
console.log(`${shows.length} titles to check`);

// retried twice; a block or rate limit won't clear by retrying, so it stops the run
async function read(op, args) {
  for (let attempt = 1; ; attempt++) {
    const r = await call("rottentomatoes", op, args);
    if (r.ok) return r.data;
    if (r.class === "input") return undefined; // no results / no such page
    if (r.class === "rate" || r.class === "blocked" || attempt === 3) throw new Error(`${op}: ${r.class}: ${r.reason}`);
    await sleep(5000 * attempt);
  }
}
const search = async (q) => adaptSearch((await read("searchTitles", { q })) ?? []);

let matched = 0;
let done = 0;
let failure;
const unmatched = [];
try {
  for (const show of shows) {
    let hit = pickResult(show, await search(show.title));
    if (!hit && show.original_title && show.original_title !== show.title) {
      await sleep(delay);
      hit = pickResult(show, await search(show.original_title));
    }
    let tomatometer = hit?.searchScore ?? null;
    let popcornmeter = null;
    if (hit) {
      await sleep(delay);
      const page = await read("getTitleScores", { kind: hit.kind, slug: hit.slug });
      tomatometer = pct(page?.criticsScore) ?? tomatometer;
      popcornmeter = pct(page?.audienceScore);
    }
    // checked even with no match, so the next run moves on to other titles
    const patch = await sb(`filmes_shows?id=eq.${encodeURIComponent(show.id)}`, {
      method: "PATCH",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({
        rt_tomatometer: tomatometer,
        rt_popcornmeter: popcornmeter,
        rt_url: hit?.url ?? null,
        rt_checked_at: new Date().toISOString(),
      }),
    });
    if (!patch.ok) throw new Error(`supabase ${patch.status}: ${await patch.text()}`);
    done++;
    if (hit) matched++;
    else {
      unmatched.push({
        id: show.id,
        show_type: show.show_type,
        title: show.title,
        original_title: show.original_title,
        year: show.show_type === "series" ? show.first_air_year : show.release_year,
      });
    }
    if (done % 50 === 0) console.log(`${done}/${shows.length} checked, ${matched} matched`);
    await sleep(delay);
  }
} catch (e) {
  failure = e;
  // a failure before the first title is saved is nearly always what the site sends this machine: show it
  if (done === 0) console.log(await probe(shows[0]?.title));
} finally {
  await shutdown();
  console.log(`checked ${done}, matched ${matched}`);
}
await sendReport({
  label: "Rotten Tomatoes scores",
  checked: done,
  matched,
  unmatched,
  error: failure?.message,
}).catch((e) => console.log(`report not sent: ${e.message}`));
if (failure) throw failure;
