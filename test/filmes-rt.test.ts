import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-expect-error plain .mjs next to the deploy job
import { pickResult } from "../deploy/filmes-metacritic/match.mjs";
// @ts-expect-error plain .mjs next to the deploy job
import { adaptSearch, pct } from "../deploy/filmes-rottentomatoes/adapt.mjs";

const rows = [
  { title: "Dune", url: "https://www.rottentomatoes.com/m/dune_2021", criticsScore: "83", year: "2021" },
  { title: "Dune", url: "https://www.rottentomatoes.com/m/dune_1984", criticsScore: "36", year: "1984" },
  {
    title: "Dune: Prophecy",
    url: "https://www.rottentomatoes.com/tv/dune_prophecy",
    criticsScoreTv: "64",
    startYear: "2024",
  },
  { title: "Dune", url: "https://www.rottentomatoes.com/tv/dune", criticsScoreTv: "", startYear: "2000" },
];

test("a row becomes a result with its kind, slug, year and search score", () => {
  const [movie, , show, noScore] = adaptSearch(rows);
  assert.deepEqual([movie.kind, movie.slug, movie.year, movie.searchScore], ["m", "dune_2021", 2021, 83]);
  assert.deepEqual([show.kind, show.slug, show.year, show.searchScore], ["tv", "dune_prophecy", 2024, 64]);
  assert.equal(noScore.searchScore, null);
});

test("the matcher picks the movie of that year, and a show only for a series", () => {
  const results = adaptSearch(rows);
  assert.equal(pickResult({ show_type: "movie", title: "Dune", release_year: 2021 }, results)?.slug, "dune_2021");
  assert.equal(pickResult({ show_type: "movie", title: "Dune", release_year: 1984 }, results)?.slug, "dune_1984");
  assert.equal(
    pickResult({ show_type: "series", title: "Dune: Prophecy", first_air_year: 2024 }, results)?.slug,
    "dune_prophecy",
  );
  assert.equal(pickResult({ show_type: "series", title: "Dune", first_air_year: 2021 }, results), undefined);
});

test("percentages: a number is kept, empty or text is null", () => {
  assert.equal(pct("90"), 90);
  assert.equal(pct(""), null);
  assert.equal(pct(undefined), null);
});
