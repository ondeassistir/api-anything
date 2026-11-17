// The run's email through Resend: the titles with no Metacritic match. Same variables as the filmes cron
// (RESEND_API_KEY, EMAIL_FROM, EMAIL_TO); without RESEND_API_KEY no email is sent.
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const MAX_ROWS = 1000;

/** run: {label?, checked, matched, unmatched: [{id, show_type, title, original_title, year}], error?} */
export function buildReport(run) {
  const { checked, matched, unmatched, error } = run;
  const subject = `${run.label ?? "Metacritic scores"}: ${matched}/${checked} matched, ${unmatched.length} not${error ? " (run stopped early)" : ""}`;
  const shown = unmatched.slice(0, MAX_ROWS);
  const rows = shown
    .map(
      (u) =>
        `<tr><td>${esc(u.title)}</td><td>${esc(u.original_title && u.original_title !== u.title ? u.original_title : "")}</td>` +
        `<td>${esc(u.show_type)}</td><td>${esc(u.year ?? "")}</td><td><code>${esc(u.id)}</code></td></tr>`,
    )
    .join("");
  const html =
    `<p>Checked ${checked} titles, matched ${matched}, no match for ${unmatched.length}.</p>` +
    (error ? `<p><b>The run stopped early:</b> ${esc(error)}</p>` : "") +
    (unmatched.length
      ? `<table border="1" cellpadding="4" cellspacing="0"><tr><th>title</th><th>original title</th><th>type</th><th>year</th><th>id</th></tr>${rows}</table>` +
        (unmatched.length > shown.length ? `<p>…and ${unmatched.length - shown.length} more.</p>` : "")
      : "");
  return { subject, html };
}

export async function sendReport(run, env = process.env) {
  const key = env.RESEND_API_KEY?.trim();
  if (!key) return console.log("RESEND_API_KEY not set: no email");
  const from = env.EMAIL_FROM?.trim();
  const to = (env.EMAIL_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!from || !to.length) return console.log("RESEND_API_KEY is set but EMAIL_FROM or EMAIL_TO is empty: no email");
  const res = await fetch(`${(env.RESEND_API_URL || "https://api.resend.com").replace(/\/$/, "")}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "user-agent": "filmes-metacritic" },
    body: JSON.stringify({ from, to, ...buildReport(run) }),
  });
  console.log(res.ok ? "report emailed" : `report not sent: resend ${res.status}`);
}
