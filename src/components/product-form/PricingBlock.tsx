'use client';

import type { ProductPayload } from '@/types/product';
import Input from '@/components/ui/Input';
import { fromMinor, toMinor } from '@/lib/price';

interface PricingBlockProps {
  state: ProductPayload;
  setField: <K extends keyof ProductPayload>(key: K, value: ProductPayload[K]) => void;
}

export default function PricingBlock({ state, setField }: PricingBlockProps): React.ReactElement {
  const retail = fromMinor(state.retail_price_minor);
  const rent = state.rent_price_minor !== null ? fromMinor(state.rent_price_minor) : '';

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Pricing</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Retail price (₹)</label>
          <Input
            type="number"
            min={0}
            value={retail}
            onChange={(e) => setField('retail_price_minor', toMinor(Number(e.target.value) || 0))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Rent price (₹)</label>
          <Input
            type="number"
            min={0}
            value={rent}
            onChange={(e) => {
              const raw = e.target.value;
              setField('rent_price_minor', raw === '' ? null : toMinor(Number(raw) || 0));
            }}
          />
        </div>
      </div>
    </section>
  );
}
