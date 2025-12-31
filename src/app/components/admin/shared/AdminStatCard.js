/**
 * Reusable stat card component for admin dashboard
 * @param {string} title - The stat label
 * @param {string|number} value - The stat value
 * @param {string} icon - Emoji or icon to display
 * @param {'blue'|'green'|'purple'|'yellow'} variant - Color variant
 */
export default function AdminStatCard({ title, value, icon, variant = 'blue' }) {
  const variantClasses = {
    blue: 'bg-[var(--bg-accent-blue-subtle)] border-[var(--border-accent-blue-subtle)]',
    green: 'bg-[var(--bg-accent-green-subtle)] border-[var(--border-accent-green-subtle)]',
    purple: 'bg-[var(--bg-accent-purple-subtle)] border-[var(--border-accent-purple-subtle)]',
    yellow: 'bg-[var(--bg-accent-yellow-subtle)] border-[var(--border-accent-yellow-subtle)]',
  };

  return (
    <div
      className={`${variantClasses[variant] || variantClasses.blue} flex items-center justify-between rounded-lg border p-6 shadow-md`}
    >
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
        <h3 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{value}</h3>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  );
}
