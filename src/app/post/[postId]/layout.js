export async function generateMetadata({ params }) {
  const { postId } = params || {};
  const title = `Post • RAGESTATE`;
  const description = `Check out this post on RAGESTATE.`;
  const urlPath = `/post/${postId}`;

  const imageUrl = "/assets/RAGESTATE.png"; // fallback brand image (1200x630 recommended)

  return {
    title,
    description,
    alternates: { canonical: urlPath },
    openGraph: {
      type: "article",
      title,
      description,
      url: urlPath,
      siteName: "RAGESTATE",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "RAGESTATE",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function PostRouteLayout({ children }) {
  return children;
}
