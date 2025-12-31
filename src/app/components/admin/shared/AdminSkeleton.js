/**
 * Skeleton loading states for admin dashboard widgets
 */

export function StatCardSkeleton() {
  return (
    <div className="flex animate-pulse items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-md">
      <div>
        <div className="h-4 w-24 rounded bg-[var(--bg-elev-2)]" />
        <div className="mt-2 h-8 w-16 rounded bg-[var(--bg-elev-2)]" />
      </div>
      <div className="h-10 w-10 rounded bg-[var(--bg-elev-2)]" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="whitespace-nowrap px-6 py-4">
          <div className="h-4 w-full max-w-[120px] animate-pulse rounded bg-[var(--bg-elev-2)]" />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border-subtle)]">
          <thead>
            <tr className="bg-[var(--bg-elev-2)]">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-3 w-20 animate-pulse rounded bg-[var(--bg-elev-1)]" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
      {/* Title skeleton */}
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-[var(--bg-elev-2)]" />

      {/* Stat cards skeleton */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Recent orders skeleton */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-5 shadow-md">
        <div className="mb-4 h-6 w-32 animate-pulse rounded bg-[var(--bg-elev-1)]" />
        <TableSkeleton rows={3} columns={5} />
      </div>
    </div>
  );
}

export function OrdersTabSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
      {/* Header with title and search */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--bg-elev-2)]" />
        <div className="flex space-x-2">
          <div className="h-10 w-48 animate-pulse rounded bg-[var(--bg-elev-2)]" />
          <div className="h-10 w-20 animate-pulse rounded bg-[var(--bg-elev-2)]" />
        </div>
      </div>
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
}

export function UsersTabSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
      {/* Header with title and search */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-44 animate-pulse rounded bg-[var(--bg-elev-2)]" />
        <div className="flex space-x-2">
          <div className="h-10 w-48 animate-pulse rounded bg-[var(--bg-elev-2)]" />
          <div className="h-10 w-20 animate-pulse rounded bg-[var(--bg-elev-2)]" />
        </div>
      </div>
      <TableSkeleton rows={10} columns={6} />
    </div>
  );
}
