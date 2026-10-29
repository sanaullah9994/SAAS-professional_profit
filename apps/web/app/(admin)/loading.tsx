export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading admin page">
      <div className="flex flex-col gap-2">
        <div className="pp-skeleton h-8 w-56" />
        <div className="pp-skeleton h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-5">
            <div className="pp-skeleton h-4 w-28" />
            <div className="pp-skeleton mt-4 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="pp-skeleton mb-4 h-5 w-40" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="pp-skeleton mb-2 h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
