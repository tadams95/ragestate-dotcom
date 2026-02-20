'use client';

import { memo } from 'react';

/**
 * @param {{ stats: { totalTickets: number, usedTickets: number, remaining: number, percentage: number } }} props
 */
function CheckInStats({ stats }) {
  const { totalTickets, usedTickets, remaining, percentage } = stats;

  const cards = [
    {
      label: 'Total Tickets',
      value: totalTickets,
      color: 'bg-[var(--bg-accent-blue-subtle)] border-[var(--border-accent-blue-subtle)]',
      icon: (
        <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
    {
      label: 'Checked In',
      value: usedTickets,
      color: 'bg-[var(--bg-accent-green-subtle)] border-[var(--border-accent-green-subtle)]',
      icon: (
        <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Remaining',
      value: remaining,
      color: 'bg-[var(--bg-accent-yellow-subtle)] border-[var(--border-accent-yellow-subtle)]',
      icon: (
        <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Check-in Rate',
      value: `${percentage}%`,
      color: percentage >= 90
        ? 'bg-[var(--bg-accent-green-subtle)] border-[var(--border-accent-green-subtle)]'
        : 'bg-[var(--bg-accent-purple-subtle)] border-[var(--border-accent-purple-subtle)]',
      icon: (
        <svg className={`h-6 w-6 ${percentage >= 90 ? 'text-green-400' : 'text-purple-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.color} flex items-center justify-between rounded-lg border p-4 shadow-md`}
        >
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{card.value}</p>
          </div>
          <div>{card.icon}</div>
        </div>
      ))}
    </div>
  );
}

export default memo(CheckInStats);
