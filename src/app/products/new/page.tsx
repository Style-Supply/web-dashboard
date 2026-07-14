'use client';

import { useState } from 'react';
import type { ProductImage } from '@/types/product';
import { useProductFormState } from '@/hooks/useProductFormState';
import ProductForm from '@/components/product-form/ProductForm';
import PreviewPane from '@/components/preview/PreviewPane';

export default function NewProductPage(): React.ReactElement {
  const form = useProductFormState();
  const [images, setImages] = useState<ProductImage[]>([]);

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b border-neutral-200">
        <ProductForm
          form={form}
          productId={null}
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
