import { getActiveEventSlugs } from '../../lib/server-only/getEventData';
import { fetchAllProductSlugs } from '../../shopify/shopifyService';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ragestate.com';

export default async function sitemap() {
  // Static pages
  const staticPages = [
    { url: `${BASE_URL}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/events`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/shop`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/feed`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Dynamic product pages
  let productPages = [];
  try {
    const productSlugs = await fetchAllProductSlugs();
    productPages = productSlugs.map((slug) => ({
      url: `${BASE_URL}/shop/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch (error) {
    console.error('[sitemap] Error fetching product slugs:', error);
  }

  // Dynamic event pages
  let eventPages = [];
  try {
    const eventSlugs = await getActiveEventSlugs();
    eventPages = eventSlugs.map((slug) => ({
      url: `${BASE_URL}/events/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch (error) {
    console.error('[sitemap] Error fetching event slugs:', error);
  }

  return [...staticPages, ...productPages, ...eventPages];
}
