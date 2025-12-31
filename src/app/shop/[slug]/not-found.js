import Link from 'next/link';

export default function Example() {
  return (
    <>
      <main className="grid min-h-full place-items-center bg-[var(--bg-root)] px-6 py-24 transition-colors duration-200 sm:py-32 lg:px-8">
        <div className="text-center">
          <p className="text-base font-semibold text-[var(--text-primary)]">404</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Page not found
          </h1>
          <p className="mt-6 text-base leading-7 text-[var(--text-secondary)]">
            Sorry, we couldn’t find the page you’re looking for.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/"
              className="rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            >
              Go back home
            </Link>
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Contact support <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
