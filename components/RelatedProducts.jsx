'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchShopifyProducts } from '../shopify/shopifyService';

export default function RelatedProducts({ currentId, productType, limit = 8 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const all = await fetchShopifyProducts();
        if (!mounted) return;
        const related = all
          .filter((p) => p?.id !== currentId && p?.productType && p.productType === productType)
          .slice(0, limit);
        setItems(related);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentId, productType, limit]);

  if (loading || items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-lg font-semibold text-white">Related products</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => {
          const img = p?.images?.[0] || p?.featuredImage || p?.variants?.[0]?.image || null;
          const src = img?.src || img?.transformedSrc || '/assets/user.png';
          const alt = img?.altText || p?.title;
          return (
            <Link
              key={p.id}
              href={`/shop/${p?.handle || p?.title?.toLowerCase?.().replace(/\s+/g, '-')}`}
              className="group"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg">
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="(min-width:1024px) 25vw, 50vw"
                  className="object-cover object-center group-hover:opacity-80"
                />
              </div>
              <div className="mt-2 line-clamp-1 text-sm text-gray-100">{p.title}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
