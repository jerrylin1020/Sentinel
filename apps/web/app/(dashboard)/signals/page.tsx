import Link from "next/link";
import { getSignals, type Severity } from "@/lib/api";
import { SignalsList } from "@/components/signals/SignalsList";

const validSeverities: Severity[] = ["p1", "p2", "observe"];
type SignalSort = "latest" | "score_desc" | "score_asc";

function taipeiDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() - offsetDays * 86_400_000));
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function hrefFor({ severity, period, date, sort = "score_desc" }: { severity?: Severity; period: "today" | "yesterday" | "5d" | "all" | "date"; date?: string; sort?: SignalSort }) {
  const params = new URLSearchParams();
  if (severity) params.set("severity", severity);
  if (period !== "5d") params.set("period", period);
  if (date) params.set("date", date);
  if (sort !== "score_desc") params.set("sort", sort);
  const query = params.toString();
  return `/signals${query ? `?${query}` : ""}`;
}

export default async function SignalsPage({ searchParams }: { searchParams: { severity?: string; view?: string; period?: string; date?: string; sort?: string } }) {
  const severity = validSeverities.includes(searchParams.severity as Severity) ? (searchParams.severity as Severity) : undefined;
  const digest = searchParams.view === "digest";
  const period = searchParams.period === "today" || searchParams.period === "yesterday" || searchParams.period === "all" || searchParams.period === "date" ? searchParams.period : "5d";
  const sort: SignalSort = searchParams.sort === "latest" || searchParams.sort === "score_asc" ? searchParams.sort : "score_desc";
  const pageSize = 2_000;
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") ? searchParams.date! : taipeiDate();
  const signalOptions = {
    ...(period === "all" ? {} : period === "5d" ? { signalDate: taipeiDate(), days: 5 } : { signalDate: period === "yesterday" ? taipeiDate(1) : selectedDate }),
    limit: pageSize,
    sort,
  };
  const signals = await getSignals(severity, signalOptions);
  const title = digest ? "訊號摘要" : severity ? `${severity.toUpperCase()} 訊號` : "訊號";

  return <div>
    <header className="page-heading"><div><h1>{title}</h1><p>{digest ? "今日所有觸發的彙整" : "所有規則、所有觸發 · 依分數由高至低排序"}</p></div><div className="flex gap-2"><button className="toolbar-button">匯出</button><Link className="toolbar-button toolbar-button-primary" href="/rules">規則設定</Link></div></header>
    <div className="space-y-3 border-b border-border px-6 py-3">
      <div className="flex flex-wrap items-center gap-3"><span className="section-label">日期</span><Filter href={hrefFor({ severity, period: "today", sort })} active={period === "today"}>今日</Filter><Filter href={hrefFor({ severity, period: "yesterday", sort })} active={period === "yesterday"}>昨天</Filter><Filter href={hrefFor({ severity, period: "5d", sort })} active={period === "5d"}>近 5 天</Filter><Filter href={hrefFor({ severity, period: "all", sort })} active={period === "all"}>全部</Filter><form action="/signals" className="flex items-center gap-1"><input type="hidden" name="period" value="date" /><input type="hidden" name="sort" value={sort} />{severity && <input type="hidden" name="severity" value={severity} />}<input name="date" type="date" defaultValue={selectedDate} className="rounded border border-border-light bg-panel px-2 py-1 font-mono text-xs text-text" /><button className="rounded border border-border px-2 py-1 text-xs text-text-dim hover:text-text">查看日期</button></form><span className="ml-auto font-mono text-[11px] text-text-faint">{signals.length} signals</span></div>
      <div className="flex flex-wrap items-center gap-3"><span className="section-label">Severity</span><Filter href={hrefFor({ severity: undefined, period, date: period === "date" ? selectedDate : undefined, sort })} active={!severity}>All</Filter><Filter href={hrefFor({ severity: "p1", period, date: period === "date" ? selectedDate : undefined, sort })} active={severity === "p1"}>P1</Filter><Filter href={hrefFor({ severity: "p2", period, date: period === "date" ? selectedDate : undefined, sort })} active={severity === "p2"}>P2</Filter><Filter href={hrefFor({ severity: "observe", period, date: period === "date" ? selectedDate : undefined, sort })} active={severity === "observe"}>Observe</Filter><span className="ml-auto section-label">排序</span><Filter href={hrefFor({ severity, period, date: period === "date" ? selectedDate : undefined, sort: "latest" })} active={sort === "latest"}>最新</Filter><Filter href={hrefFor({ severity, period, date: period === "date" ? selectedDate : undefined, sort: "score_desc" })} active={sort === "score_desc"}>分數高</Filter><Filter href={hrefFor({ severity, period, date: period === "date" ? selectedDate : undefined, sort: "score_asc" })} active={sort === "score_asc"}>分數低</Filter></div>
    </div>
    <section className="mx-6 mt-5 rounded-lg border border-border bg-panel p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="section-label text-text">訊號分級說明</h2><Link href="/watchlist" className="text-xs text-cyan">調整個別標的 P1 門檻 →</Link></div><div className="mt-3 grid gap-3 text-xs leading-5 text-text-dim md:grid-cols-3"><p><strong className="text-p1">P1 高信心</strong><br />分數達此標的 P1 門檻，且至少 3 條規則同時觸發。</p><p><strong className="text-p2">P2 中信心</strong><br />未達 P1，但至少有一條底層規則的等級是 P1 或 P2。</p><p><strong className="text-text">Observe 觀察</strong><br />其餘觸發只記錄、不推播。系統目前沒有 P3。</p></div></section>
    <section className="px-4 py-5 sm:px-6"><div className="mb-2 flex justify-between"><h2 className="text-sm font-semibold">{digest ? "今日訊號摘要" : period === "5d" ? "近 5 天訊號" : period === "all" ? "所有歷史訊號" : "訊號列表"}</h2><span className="font-mono text-[11px] text-text-faint">已載入 {signals.length} 則</span></div><SignalsList signals={signals} /></section>
  </div>;
}

function Filter({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) { return <Link href={href} className={`rounded border px-2.5 py-1 font-mono text-xs ${active ? "border-border-light bg-panel-3 text-text" : "border-border bg-panel text-text-dim hover:text-text"}`}>{children}</Link>; }
