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
import SizeChartUploader from './SizeChartUploader';
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
  if (!v.name.trim()) return 'Product Name is required to publish';
  if (!v.brand_id) return 'Brand is required to publish';
  if (!v.category_id) return 'Category is required to publish';
  if (!v.subcategory_id) return 'Subcategory is required to publish';
  const subNode = findNode(tree, v.subcategory_id);
  if (subNode && subNode.children.length > 0 && !v.sub_subcategory_id) return 'Sub-subcategory is required to publish';
  if (!v.material_id) return 'Material is required to publish';
  if (!v.description?.trim()) return 'Description is required to publish';
  if (!(v.retail_price_minor > 0)) return 'Retail price must be greater than ₹0';
  if (v.variants.length === 0) return 'At least one variant is required';
  for (const va of v.variants) {
    if ((va.colour_id !== null) === (va.custom_colour !== null)) return 'Variant: pick either colour or custom colour (not both/neither)';
    if (!va.location_id) return 'Variant: location is required';
    if (va.quantity < 0) return 'Variant: quantity must be ≥ 0';
  }
  if (images.length === 0) return 'At least one image is required to publish';
  return null;
}

interface ProductFormProps {
  form: UseProductFormState;
  productId: string | null;
  images: ProductImage[];
  onImagesChange: (next: ProductImage[]) => void;
  onSaveSuccess?: () => void;
}

type SaveAction = 'draft' | 'published' | null;

export default function ProductForm({
  form,
  productId,
  images,
  onImagesChange,
  onSaveSuccess,
}: ProductFormProps): React.ReactElement {
  const router = useRouter();
  const { showToast } = useToast();
  const { invalidate } = useProducts();
  const { state, setField } = form;
  const [saveAction, setSaveAction] = useState<SaveAction>(null);
  const { tree, brands } = useTaxonomy();
  const selectedBrand = brands?.find((b) => b.id === state.brand_id);

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
        onSaveSuccess?.();
      } else {
        const created = await saveProduct(payload);
        invalidate();
        showToast('success', status === 'published' ? 'Product created and published' : 'Draft created successfully');
        onSaveSuccess?.();
        router.push(`/products/${created.id}`);
      }
    } catch (e) {
      let message = 'Failed to save product';
      if (e instanceof Error) {
        message = e.message;
      }
      if (/products_sku_unique|duplicate key.*sku/i.test(message)) {
        message = 'This SKU is already in use by another product. Please enter a unique SKU.';
      } else if (/violates foreign key/i.test(message)) {
        message = 'Invalid reference selected for brand, category, or material.';
      } else if (/violates not-null/i.test(message)) {
        message = 'Please fill in all required fields.';
      }
      showToast('error', message);
    } finally {
      setSaveAction(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-8 overflow-auto p-6">
        <BasicFieldsBlock value={state} onChange={(patch) => { for (const [k, v] of Object.entries(patch)) setField(k as keyof typeof state, v); }} />
        <PricingBlock state={state} setField={setField} setPatch={form.setPatch} />
        <VariantEditor
          value={state.variants}
          onChange={(next) => setField('variants', next)}
          productSku={state.sku}
        />
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Size Chart</h2>
            <span className="text-xs text-neutral-400">Optional · Product-level size guide</span>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <SizeChartUploader
              value={state.size_chart_url ?? null}
              brandDefaultUrl={selectedBrand?.size_chart_url ?? null}
              brandName={selectedBrand?.name ?? null}
              onChange={(url) => setField('size_chart_url', url)}
            />
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Images</h2>
          <ImageImporter
            productId={productId}
            variants={state.variants}
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
