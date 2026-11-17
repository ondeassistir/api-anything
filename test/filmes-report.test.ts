import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-expect-error plain .mjs next to the deploy job
import { buildReport } from "../deploy/filmes-metacritic/report.mjs";

test("the report lists each unmatched title, escaped, with the counts in the subject", () => {
  const r = buildReport({
    checked: 3,
    matched: 1,
    unmatched: [
      { id: "tt1", show_type: "series", title: "Tom & <Jerry>", original_title: "Tom & <Jerry>", year: 2005 },
      { id: "tt2", show_type: "movie", title: "Pt Title", original_title: "Orig", year: 2020 },
    ],
  });
  assert.equal(r.subject, "Metacritic scores: 1/3 matched, 2 not");
  assert.match(r.html, /Tom &amp; &lt;Jerry&gt;/);
  assert.match(r.html, /<td>Orig<\/td>/);
});

test("a run that stopped early says so", () => {
  const r = buildReport({ checked: 1, matched: 0, unmatched: [], error: "x: blocked" });
  assert.match(r.subject, /run stopped early/);
  assert.match(r.html, /x: blocked/);
});
