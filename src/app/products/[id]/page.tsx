'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, ProductImage } from '@/types/product';
import { deleteProduct, getProduct } from '@/lib/api';
import { useProductFormState } from '@/hooks/useProductFormState';
import { useToast } from '@/components/ui/Toast';
import ProductForm from '@/components/product-form/ProductForm';
import PreviewPane from '@/components/preview/PreviewPane';
import Button from '@/components/ui/Button';

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactElement {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const form = useProductFormState();
  const { set } = form;
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    getProduct(id)
      .then((product: Product) => {
        if (cancelled) return;
        set({
          name: product.name,
          brand: product.brand,
          retail_price_minor: product.retail_price_minor,
          rent_price_minor: product.rent_price_minor,
          currency: product.currency,
          category: product.category,
          collection: product.collection,
          fabric: product.fabric,
          description: product.description,
          status: product.status,
          variants: product.variants,
        });
        setImages(product.images);
        setLoaded(true);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [id, set]);

  async function handleDelete(): Promise<void> {
    if (!confirm('Delete this product?')) return;
    setDeleting(true);
    try {
      await deleteProduct(id);
      showToast('success', 'Product deleted successfully');
      router.push('/products');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to delete product');
      setDeleting(false);
    }
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!loaded) return <div className="p-6 text-neutral-500">Loading…</div>;

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-3">
          <h1 className="text-lg font-semibold">Edit product</h1>
          <Button variant="ghost" size="sm" loading={deleting} onClick={() => void handleDelete()}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
        <ProductForm
          form={form}
          productId={id}
          images={images}
          onImagesChange={setImages}
        />
      </div>
      <div className="bg-neutral-50 pb-16">
        <div className="px-6 pt-6 pb-3 text-sm font-medium text-neutral-600">Live preview</div>
        <PreviewPane state={form.state} images={images} />
      </div>
    </div>
  );
}
