# /page - Create a New Next.js Page

Create a new page following RAGESTATE Next.js App Router patterns.

## Usage
```
/page route/path
```

## Instructions

When creating a page:

1. **File Location**: `src/app/[route]/page.js`

2. **Client Page Template** (most common):
```javascript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@fb/context/FirebaseContext';

export default function PageName() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/auth');
    }
  }, [authLoading, currentUser, router]);

  if (authLoading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-root)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-root)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Page content */}
      </div>
    </div>
  );
}
```

3. **Server Page Template** (for SSR/data fetching):
```javascript
import { notFound } from 'next/navigation';
import ClientComponent from './ClientComponent';

// Optional: Generate metadata
export async function generateMetadata({ params }) {
  return {
    title: 'Page Title - RAGESTATE',
  };
}

export default async function PageName({ params }) {
  const { id } = await params;

  // Server-side data fetching
  const data = await fetchData(id);

  if (!data) {
    notFound();
  }

  return <ClientComponent data={data} />;
}
```

4. **Dynamic Route Template** (`[param]/page.js`):
```javascript
'use client';

import { useParams } from 'next/navigation';

export default function DynamicPage() {
  const params = useParams();
  const { paramName } = params;

  // Use paramName...
}
```

5. **Layout Structure**:
   - Header is provided by root layout
   - Use `pt-24` or similar for header offset
   - Max width container: `max-w-6xl mx-auto px-4`

6. **Common Page Patterns**:
```javascript
// Back button
<button onClick={() => router.back()} className="...">
  ← Back
</button>

// Loading state
{isLoading && <LoadingSpinner />}

// Error state
{error && (
  <div className="text-center text-[var(--danger)]">
    {error.message}
  </div>
)}

// Empty state
{!isLoading && items.length === 0 && (
  <div className="text-center text-[var(--text-tertiary)]">
    No items found.
  </div>
)}
```

Ask the user for:
- Route path (e.g., `/chat/new`, `/events/[eventId]`)
- Whether it needs authentication
- What data it should display
- Any dynamic parameters
