import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-expect-error plain .mjs next to the deploy job
import { pickResult, scoreOf } from "../deploy/filmes-metacritic/match.mjs";

const r = (title: string, type: string, releaseDate: string, metascore = "80") => ({
  title,
  type,
  releaseDate,
  metascore,
});

test("a movie matches by type, title and year, not the game or the series of the same name", () => {
  const results = [
    r("The Godfather", "game", "Mar 21, 2006"),
    r("The Godfather", "movie", "Mar 24, 1972", "100"),
    r("Severance", "tv show", "Feb 18, 2022"),
  ];
  const hit = pickResult({ show_type: "movie", title: "The Godfather", release_year: 1972 }, results);
  assert.equal(hit?.metascore, "100");
  assert.equal(pickResult({ show_type: "series", title: "The Godfather", first_air_year: 1972 }, results), undefined);
});

test("accents, case and & are ignored; the year may be one off but not more", () => {
  const results = [r("Amélie", "movie", "Nov 2, 2001")];
  assert.ok(pickResult({ show_type: "movie", title: "x", original_title: "AMELIE", release_year: 2002 }, results));
  assert.equal(pickResult({ show_type: "movie", title: "Amelie", release_year: 2005 }, results), undefined);
  assert.ok(
    pickResult({ show_type: "movie", title: "Tom & Jerry", release_year: 2021 }, [
      r("Tom and Jerry", "movie", "Feb 26, 2021"),
    ]),
  );
});

test("two equally good candidates are no match; the closer year wins", () => {
  const twins = [r("Dune", "movie", "Dec 17, 2021"), r("Dune", "movie", "Dec 17, 2021")];
  assert.equal(pickResult({ show_type: "movie", title: "Dune", release_year: 2021 }, twins), undefined);
  const remake = [r("Dune", "movie", "Dec 14, 1984"), r("Dune", "movie", "Oct 22, 2021", "74")];
  assert.equal(pickResult({ show_type: "movie", title: "Dune", release_year: 2021 }, remake)?.metascore, "74");
});

test("tbd and missing scores are null", () => {
  assert.equal(scoreOf({ metascore: "94" }), 94);
  assert.equal(scoreOf({ metascore: "tbd" }), null);
  assert.equal(scoreOf(undefined), null);
});

test("a subtitle on one side matches only in the exact year", () => {
  const dune = [
    r("Dune: Part One", "movie", "Oct 22, 2021", "74"),
    r("Dune: Part Two", "movie", "Mar 1, 2024", "79"),
    r("Dune", "movie", "Dec 14, 1984", "41"),
  ];
  assert.equal(pickResult({ show_type: "movie", title: "Dune", release_year: 2021 }, dune)?.metascore, "74");
  assert.equal(pickResult({ show_type: "movie", title: "Dune: Part Two", release_year: 2024 }, dune)?.metascore, "79");
  // the year is off by one: not enough for a subtitle match
  assert.equal(pickResult({ show_type: "movie", title: "Dune", release_year: 2022 }, dune), undefined);
  // no result of that year at all
  assert.equal(pickResult({ show_type: "movie", title: "Dune", release_year: 2000 }, dune), undefined);
  // the DB side may carry the subtitle instead
  assert.equal(
    pickResult({ show_type: "movie", title: "Dune: Part One", release_year: 2021 }, [
      r("Dune", "movie", "Oct 22, 2021", "74"),
    ])?.metascore,
    "74",
  );
});
