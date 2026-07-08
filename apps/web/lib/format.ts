// Manual date/time formatting helpers.
//
// We intentionally avoid `Date.prototype.toLocaleString` for zh-TW here: Node's built-in ICU
// and the browser's ICU can render the AM/PM marker with different whitespace (e.g. a narrow
// no-break space vs. a regular space), which is invisible to the eye but makes the server-
// rendered HTML and the client hydration text mismatch — triggering a Next.js hydration error.
// These helpers produce a fixed, deterministic string on both sides instead.

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** e.g. "07/07 上午11:06" */
export function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${month}/${day} ${fmtHourMinute(d)}`;
}

/** e.g. "上午11:06" */
export function fmtHourMinute(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  let h = d.getHours();
  const period = h < 12 ? "上午" : "下午";
  h = h % 12;
  if (h === 0) h = 12;
  return `${period}${pad2(h)}:${pad2(d.getMinutes())}`;
}
