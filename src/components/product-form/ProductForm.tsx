'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductImage, ProductPayload } from '@/types/product';
import { saveProduct, updateProduct } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import BasicFieldsBlock from './BasicFieldsBlock';
import PricingBlock from './PricingBlock';
import VariantEditor, { hasDuplicateVariants } from './VariantEditor';
import ImageImporter from './ImageImporter';
import type { UseProductFormState } from '@/hooks/useProductFormState';

interface ProductFormProps {
  form: UseProductFormState;
  productId: string | null;
  images: ProductImage[];
  onImagesChange: (next: ProductImage[]) => void;
}

type SaveAction = 'draft' | 'published' | null;

export default function ProductForm({
  form,
  productId,
  images,
  onImagesChange,
}: ProductFormProps): React.ReactElement {
  const router = useRouter();
  const { showToast } = useToast();
  const { state, setField, addVariant, removeVariant, updateVariant } = form;
  const [saveAction, setSaveAction] = useState<SaveAction>(null);

  const dup = hasDuplicateVariants(state.variants);
  const invalid =
    !state.name.trim() ||
    state.retail_price_minor < 0 ||
    !state.variants.some((v) => v.size) ||
    dup;

  const saving = saveAction !== null;

  async function handleSave(status: 'draft' | 'published'): Promise<void> {
    setSaveAction(status);
    try {
      const payload: ProductPayload = { ...state, status };
      if (productId) {
        await updateProduct(productId, payload);
        showToast('success', status === 'published' ? 'Product published successfully' : 'Draft saved successfully');
      } else {
        const created = await saveProduct(payload);
        showToast('success', status === 'published' ? 'Product created and published' : 'Draft created successfully');
        router.push(`/products/${created.id}`);
      }
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to save product');
    } finally {
      setSaveAction(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-8 overflow-auto p-6">
        <BasicFieldsBlock state={state} setField={setField} />
        <PricingBlock state={state} setField={setField} />
        <VariantEditor
          variants={state.variants}
          addVariant={addVariant}
          removeVariant={removeVariant}
          updateVariant={updateVariant}
        />
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Images</h2>
          <ImageImporter
            productId={productId}
            images={images}
            onImagesChange={onImagesChange}
          />
        </section>
      </div>
      <div className="flex items-center justify-end border-t border-neutral-200 bg-white px-6 py-3">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={saving || invalid}
            loading={saveAction === 'draft'}
            onClick={() => handleSave('draft')}
          >
            {saveAction === 'draft' ? 'Saving draft…' : 'Save draft'}
          </Button>
          <Button
            variant="primary"
            disabled={saving || invalid}
            loading={saveAction === 'published'}
            onClick={() => handleSave('published')}
          >
            {saveAction === 'published' ? 'Publishing…' : 'Save & publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
