export default function DashboardLoading() {
  return (
    <div className="animate-pulse motion-reduce:animate-none">
      <div className="border-b border-border px-6 py-4">
        <div className="h-5 w-32 rounded bg-panel-3" />
        <div className="mt-2 h-3 w-56 rounded bg-panel-2" />
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-bg px-5 py-5">
            <div className="h-3 w-20 rounded bg-panel-2" />
            <div className="mt-3 h-8 w-14 rounded bg-panel-3" />
            <div className="mt-3 h-3 w-28 rounded bg-panel-2" />
          </div>
        ))}
      </div>
      <div className="grid gap-px border-t border-border bg-border xl:grid-cols-[2fr_1fr]">
        <div className="h-80 bg-bg p-6"><div className="h-5 w-2/3 rounded bg-panel-3" /><div className="mt-4 h-3 w-full rounded bg-panel-2" /></div>
        <div className="h-80 bg-bg p-6"><div className="h-4 w-28 rounded bg-panel-3" /></div>
      </div>
    </div>
  );
}
