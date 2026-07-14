'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Product, ProductPayload } from '@/types/product';
import { getProduct } from '@/lib/api';
import PreviewPane from '@/components/preview/PreviewPane';

function productToPayload(p: Product): ProductPayload {
  return {
    name: p.name,
    brand: p.brand,
    retail_price_minor: p.retail_price_minor,
    rent_price_minor: p.rent_price_minor,
    currency: p.currency,
    category: p.category,
    collection: p.collection,
    fabric: p.fabric,
    description: p.description,
    status: p.status,
    variants: p.variants,
  };
}

export default function StandalonePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactElement {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProduct(id)
      .then((p) => {
        if (!cancelled) setProduct(p);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!product) return <div className="p-6 text-neutral-500">Loading…</div>;

  return (
    <div>
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <Link href={`/products/${id}`} className="text-sm text-[color:var(--color-primary)] hover:underline">
          ← Back to edit
        </Link>
      </div>
      <PreviewPane state={productToPayload(product)} images={product.images} />
    </div>
  );
}
