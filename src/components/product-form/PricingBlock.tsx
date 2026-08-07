'use client';

import type { ProductPayload } from '@/types/product';
import Input from '@/components/ui/Input';
import { fromMinor, toMinor, calculateTierRentalFee } from '@/lib/price';

interface PricingBlockProps {
  state: ProductPayload;
  setField: <K extends keyof ProductPayload>(key: K, value: ProductPayload[K]) => void;
}

export default function PricingBlock({ state, setField }: PricingBlockProps): React.ReactElement {
  const retail = fromMinor(state.retail_price_minor);
  const calculatedRental = calculateTierRentalFee(retail);
  const customRent = state.rent_price_minor != null ? fromMinor(state.rent_price_minor) : '';

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Pricing & Rental Fee</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">MRP / Retail price (₹)</label>
          <Input
            type="number"
            min={1}
            value={retail}
            onChange={(e) => setField('retail_price_minor', toMinor(Number(e.target.value) || 0))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">
            Rental Fee (₹) <span className="text-neutral-400 font-normal">(Optional Override)</span>
          </label>
          <Input
            type="number"
            min={0}
            placeholder={`Auto: ₹${calculatedRental.toLocaleString('en-IN')}`}
            value={customRent}
            onChange={(e) => {
              const val = e.target.value;
              setField('rent_price_minor', val === '' ? null : toMinor(Number(val) || 0));
            }}
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            Tier default: <span className="font-semibold text-neutral-700">₹{calculatedRental.toLocaleString('en-IN')}</span>. Clear to reset to auto tier.
          </p>
        </div>
      </div>
    </section>
  );
}
