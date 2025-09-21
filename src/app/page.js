import Feed from './components/Feed';
import Header from './components/Header';
import PostComposer from './components/PostComposer';

export default function Home() {
  return (
    <div className="isolate min-h-screen bg-black px-4 pb-12 pt-24 text-white sm:px-6 sm:pb-24 lg:px-8">
      <Header />
      <h1 className="mb-8 text-center text-[clamp(18px,5vw,20px)] font-bold tracking-tight sm:text-4xl">
        Feed
      </h1>
      <PostComposer />
      <Feed />
    </div>
  );
}
