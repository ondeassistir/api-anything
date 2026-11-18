// What does rottentomatoes.com answer this machine? One plain request, summarised: status, final URL, whether
// the search rows are there, and the start of the page's text. Run: node deploy/filmes-rottentomatoes/probe.mjs [title]
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36";

export async function probe(q = "dune") {
  const url = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, signal: AbortSignal.timeout(30000) });
    const body = await res.text();
    const text = body
      .replace(/<(script|style|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const marks = ["captcha", "access denied", "unusual traffic", "are you a robot", "verify you are human", "blocked", "cf-chl", "akamai", "px-captcha"]
      .filter((m) => body.toLowerCase().includes(m));
    return [
      `probe ${url}`,
      `status ${res.status}, final ${res.url}, ${body.length} bytes, server ${res.headers.get("server") ?? "?"}`,
      `search rows: ${(body.match(/<search-page-media-row/g) ?? []).length}, no-results block: ${body.includes("js-search-no-results")}`,
      `challenge markers: ${marks.join(", ") || "none"}`,
      `page text: ${text.slice(0, 300)}`,
    ].join("\n");
  } catch (e) {
    return `probe ${url}\nfailed: ${e.message}`;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(await probe(process.argv[2]));
