'use client';

import type { ProductPayload } from '@/types/product';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import AutocompleteInput from './AutocompleteInput';

interface BasicFieldsBlockProps {
  state: ProductPayload;
  setField: <K extends keyof ProductPayload>(key: K, value: ProductPayload[K]) => void;
}

export default function BasicFieldsBlock({
  state,
  setField,
}: BasicFieldsBlockProps): React.ReactElement {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Basics</h2>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">Name</label>
        <Input
          value={state.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="Product name"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">Brand</label>
        <AutocompleteInput
          field="brand"
          value={state.brand ?? ''}
          onChange={(v) => setField('brand', v || null)}
          placeholder="Brand"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Category</label>
          <AutocompleteInput
            field="category"
            value={state.category ?? ''}
            onChange={(v) => setField('category', v || null)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Collection</label>
          <AutocompleteInput
            field="collection"
            value={state.collection ?? ''}
            onChange={(v) => setField('collection', v || null)}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">Fabric</label>
        <AutocompleteInput
          field="fabric"
          value={state.fabric ?? ''}
          onChange={(v) => setField('fabric', v || null)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">Description</label>
        <Textarea
          value={state.description ?? ''}
          onChange={(e) => setField('description', e.target.value || null)}
        />
      </div>
    </section>
  );
}
