import Feed from '../../components/Feed';

export default function LatestFeedPage() {
  return (
    <div className="isolate min-h-screen bg-black px-6 py-12 text-white sm:py-24 lg:px-8">
      {/* Header is rendered by layout.js */}
      <h1 className="mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl">Latest</h1>
      <Feed forcePublic={true} />
      {/* Footer is rendered globally in RootLayout */}
    </div>
  );
}
