'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductImage, ProductPayload } from '@/types/product';
import { saveProduct, updateProduct } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useProducts } from '@/context/ProductsContext';
import Button from '@/components/ui/Button';
import BasicFieldsBlock from './BasicFieldsBlock';
import PricingBlock from './PricingBlock';
import VariantEditor, { tupleKey } from './VariantEditor';
import ImageImporter from './ImageImporter';
import type { UseProductFormState } from '@/hooks/useProductFormState';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import type { CategoryTreeNode } from '@/types/taxonomy';

function findNode(tree: CategoryTreeNode[], id: string | null): CategoryTreeNode | null {
  if (!id) return null;
  for (const n of tree) {
    if (n.id === id) return n;
    const child = findNode(n.children, id);
    if (child) return child;
  }
  return null;
}

interface CheckArgs {
  v: ProductPayload;
  tree: CategoryTreeNode[];
  images: ProductImage[];
}

function publishCheck({ v, tree, images }: CheckArgs): string | null {
  if (!v.name.trim()) return 'name is required';
  if (!v.brand_id) return 'brand is required';
  if (!v.category_id) return 'category is required';
  if (!v.subcategory_id) return 'subcategory is required';
  const subNode = findNode(tree, v.subcategory_id);
  if (subNode && subNode.children.length > 0 && !v.sub_subcategory_id) return 'sub-subcategory is required';
  if (!v.material_id) return 'material is required';
  if (!v.description?.trim()) return 'description is required';
  if (!(v.retail_price_minor > 0)) return 'retail price must be greater than 0';
  if (v.variants.length === 0) return 'at least one variant is required';
  for (const va of v.variants) {
    if ((va.colour_id !== null) === (va.custom_colour !== null)) return 'variant: pick either colour or custom_colour (not both/neither)';
    if (!va.location_id) return 'variant: location is required';
    if (va.quantity < 0) return 'variant: quantity must be ≥ 0';
  }
  if (images.length === 0) return 'at least one image is required';
  return null;
}

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
  const { invalidate } = useProducts();
  const { state, setField } = form;
  const [saveAction, setSaveAction] = useState<SaveAction>(null);
  const { tree } = useTaxonomy();

  // Duplicate detection using tupleKey
  const counts = new Map<string, number>();
  for (const v of state.variants) counts.set(tupleKey(v), (counts.get(tupleKey(v)) ?? 0) + 1);
  const dup = [...counts.values()].some((c) => c > 1);
  const invalid =
    !state.name.trim() ||
    state.retail_price_minor < 0 ||
    !state.variants.some((v) => v.size) ||
    dup;

  const publishError = publishCheck({ v: state, tree, images });
  const canPublish = publishError === null;

  const saving = saveAction !== null;

  async function handleSave(status: 'draft' | 'published'): Promise<void> {
    setSaveAction(status);
    try {
      const payload: ProductPayload = { ...state, status };
      if (productId) {
        await updateProduct(productId, payload);
        invalidate();
        showToast('success', status === 'published' ? 'Product published successfully' : 'Draft saved successfully');
      } else {
        const created = await saveProduct(payload);
        invalidate();
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
        <BasicFieldsBlock value={state} onChange={(patch) => { for (const [k, v] of Object.entries(patch)) setField(k as keyof typeof state, v); }} />
        <PricingBlock state={state} setField={setField} />
        <VariantEditor
          value={state.variants}
          onChange={(next) => setField('variants', next)}
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
        <div className="flex flex-col items-end gap-2">
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
              disabled={saving || !canPublish}
              loading={saveAction === 'published'}
              onClick={() => handleSave('published')}
              title={canPublish ? 'Publish' : `Cannot publish: ${publishError}`}
            >
              {saveAction === 'published' ? 'Publishing…' : 'Save & publish'}
            </Button>
          </div>
          {!canPublish && <p className="text-xs text-red-600">{publishError}</p>}
        </div>
      </div>
    </div>
  );
}
