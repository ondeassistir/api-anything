// The `search` op's rows -> what match.mjs reads. A movie row has criticsScore + year, a TV row
// criticsScoreTv + startYear (the site spells their attributes differently); the kind is in the URL.
export function adaptSearch(rows) {
  return rows
    .filter((r) => r.title && r.url)
    .map((r) => {
      const tv = r.url.includes("/tv/");
      const score = (tv ? r.criticsScoreTv : r.criticsScore) ?? "";
      return {
        title: r.title,
        type: tv ? "tv show" : "movie",
        year: Number(tv ? r.startYear : r.year) || undefined,
        url: r.url,
        kind: tv ? "tv" : "m",
        slug: r.url.split("/").filter(Boolean).at(-1),
        searchScore: /^\d{1,3}$/.test(score) ? Number(score) : null,
      };
    });
}

/** "83" -> 83; "" or nothing -> null */
export const pct = (v) => (/^\d{1,3}$/.test(String(v ?? "")) ? Number(v) : null);
