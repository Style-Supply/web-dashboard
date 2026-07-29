'use client';

import { useState } from 'react';
import type { ProductImage } from '@/types/product';
import { useProductFormState } from '@/hooks/useProductFormState';
import ProductForm from '@/components/product-form/ProductForm';

export default function NewProductPage(): React.ReactElement {
  const form = useProductFormState();
  const [images, setImages] = useState<ProductImage[]>([]);

  return (
    <div className="flex flex-col">
      <div className="bg-white">
        <ProductForm
          form={form}
          productId={null}
          images={images}
          onImagesChange={setImages}
        />
      </div>
    </div>
  );
}
