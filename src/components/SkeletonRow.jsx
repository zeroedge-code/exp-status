export function SkeletonRow({ delay = 0 }) {
  return (
    <div
      className="card row-enter flex min-h-[76px] items-center gap-4 px-4 py-4"
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden="true"
    >
      <div className="skeleton h-3 w-3 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="skeleton h-4 w-40 max-w-full rounded" />
        <div className="skeleton mt-3 h-3 w-56 max-w-full rounded" />
      </div>
      <div className="skeleton hidden h-6 w-24 rounded sm:block" />
    </div>
  )
}
