const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ragestate.com';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/chat/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
