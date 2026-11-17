// Which Metacritic search result, if any, is this filmes title? Wrong is worse than empty:
// type, normalized title and year must all agree, and a tie between two candidates is no match.
const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const TYPE = { movie: "movie", series: "tv show" };

// "Dune: Part One" -> "dune": the title before a subtitle
const base = (s) => norm(String(s ?? "").split(/:| - /)[0]);

/**
 * show: {show_type, title, original_title, release_year, first_air_year}; results: the `search` op's data.
 * Same title, year +/-1: a match. One side with a subtitle the other lacks ("Dune" / "Dune: Part One"):
 * a match only in the exact same year.
 */
export function pickResult(show, results) {
  const type = TYPE[show.show_type];
  const year = show.show_type === "series" ? show.first_air_year : show.release_year;
  const names = new Set([norm(show.title), norm(show.original_title)].filter(Boolean));
  const bases = new Set([base(show.title), base(show.original_title)].filter(Boolean));
  if (!type || !names.size) return undefined;
  const gapOf = (r) => (year && r.releaseDate ? Math.abs(Number(r.releaseDate.slice(-4)) - year) : 99);
  const best = (list) => {
    const found = list.map((r) => ({ r, gap: gapOf(r) })).sort((a, b) => a.gap - b.gap);
    if (!found.length || found[0].gap > 1 || (found[1] && found[1].gap === found[0].gap)) return undefined;
    return found[0];
  };
  const ofType = results.filter((r) => r.type === type);
  const exact = best(ofType.filter((r) => names.has(norm(r.title))));
  if (exact) return exact.r;
  const loose = best(
    ofType.filter((r) => (names.has(base(r.title)) || bases.has(norm(r.title))) && gapOf(r) === 0),
  );
  return loose?.r;
}

/** "94" -> 94; "tbd" or nothing -> null */
export const scoreOf = (r) => (r && /^\d{1,3}$/.test(r.metascore ?? "") ? Number(r.metascore) : null);
