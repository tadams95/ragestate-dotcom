'use client';

import { useDirectionalWipe } from '../../../../../lib/hooks/useDirectionalWipe';

/**
 * Reusable stat card component for admin dashboard
 * @param {string} title - The stat label
 * @param {string|number} value - The stat value
 * @param {string} icon - Emoji or icon to display
 */
export default function AdminStatCard({ title, value, icon }) {
  const { onMouseEnter, onMouseLeave } = useDirectionalWipe();

  return (
    <div
      className="card-wipe-border flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-md transition-shadow hover:shadow-lg"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
        <h3 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{value}</h3>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  );
}
