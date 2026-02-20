'use client';

import AdminProtected from '../../components/AdminProtected';
import EventDayCommandCenter from '../../components/admin/event-day/EventDayCommandCenter';

export default function EventDayPage() {
  return (
    <AdminProtected>
      <div className="min-h-screen bg-[var(--bg-root)]">
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8">
          <EventDayCommandCenter />
        </main>
      </div>
    </AdminProtected>
  );
}
