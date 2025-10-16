import Header from './components/Header';
import HomeEventHero from './components/HomeEventHero';

export default function Home() {
  return (
    <div className="isolate min-h-screen bg-black text-white">
      <Header />
      <main>
        <HomeEventHero />
        {/* <UpcomingEventsPreview /> */}
      </main>
    </div>
  );
}
