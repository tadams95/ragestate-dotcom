/**
 * Reusable table component for admin sections
 * @param {Array<{key: string, label: string}>} columns - Column definitions
 * @param {Array<Object>} data - Row data
 * @param {function} renderRow - Function to render each row: (item, index) => React.ReactNode
 * @param {string} emptyMessage - Message when no data
 * @param {Object} pagination - { current, total, perPage, onChange }
 */
export default function AdminTable({ columns, data, renderRow, emptyMessage, pagination }) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-[var(--text-tertiary)]">
        {emptyMessage || 'No data found.'}
      </div>
    );
  }

  const startIndex = pagination ? (pagination.current - 1) * pagination.perPage + 1 : 1;
  const endIndex = pagination
    ? Math.min(pagination.current * pagination.perPage, pagination.total)
    : data.length;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border-subtle)]">
          <thead>
            <tr className="bg-[var(--bg-elev-2)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {data.map((item, index) => renderRow(item, index))}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-3">
          <div className="text-sm text-[var(--text-tertiary)]">
            Showing <span className="font-medium">{startIndex}</span> to{' '}
            <span className="font-medium">{endIndex}</span> of{' '}
            <span className="font-medium">{pagination.total}</span> results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => pagination.onChange('prev')}
              disabled={pagination.current === 1}
              className={`rounded-md border border-[var(--border-subtle)] px-3 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] ${
                pagination.current === 1 ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onChange('next')}
              disabled={pagination.current * pagination.perPage >= pagination.total}
              className={`rounded-md border border-[var(--border-subtle)] px-3 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] ${
                pagination.current * pagination.perPage >= pagination.total
                  ? 'cursor-not-allowed opacity-50'
                  : ''
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
