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

const taipeiFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function taipeiParts(input: string | Date) {
  const parts = taipeiFormatter.formatToParts(typeof input === "string" ? new Date(input) : input);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute") };
}

/** e.g. "2026-07-07", using the Taipei calendar day. */
export function fmtTaipeiDate(input: string | Date) {
  const { year, month, day } = taipeiParts(input);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** e.g. "07/07 上午11:06" */
export function fmtDateTime(iso: string) {
  const { month, day } = taipeiParts(iso);
  return `${pad2(month)}/${pad2(day)} ${fmtHourMinute(iso)}`;
}

/** e.g. "上午11:06" */
export function fmtHourMinute(input: string | Date) {
  const { hour, minute } = taipeiParts(input);
  let h = hour;
  const period = h < 12 ? "上午" : "下午";
  h = h % 12;
  if (h === 0) h = 12;
  return `${period}${pad2(h)}:${pad2(minute)}`;
}
