'use client';

import type { ProductPayload } from '@/types/product';
import Input from '@/components/ui/Input';
import { fromMinor, toMinor, calculateTierRentalFee } from '@/lib/price';

interface PricingBlockProps {
  state: ProductPayload;
  setField: <K extends keyof ProductPayload>(key: K, value: ProductPayload[K]) => void;
  setPatch?: (patch: Partial<ProductPayload>) => void;
}

export default function PricingBlock({ state, setField, setPatch }: PricingBlockProps): React.ReactElement {
  const retail = fromMinor(state.retail_price_minor);
  const calculatedRental = calculateTierRentalFee(retail);
  const customRent = state.rent_price_minor != null ? fromMinor(state.rent_price_minor) : '';

  const isRentable = state.is_rentable ?? true;
  const isBuyable = state.is_buyable ?? true;

  const handleSetMode = (rentable: boolean, buyable: boolean) => {
    const patch: Partial<ProductPayload> = {
      is_rentable: rentable,
      is_buyable: buyable,
    };
    if (!rentable) {
      patch.rent_price_minor = null;
    }
    if (setPatch) {
      setPatch(patch);
    } else {
      setField('is_rentable', rentable);
      setField('is_buyable', buyable);
      if (!rentable) setField('rent_price_minor', null);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Pricing & Fulfillment Mode</h2>
      
      {/* Availability / Fulfillment Mode Selector */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-neutral-700">Fulfillment Mode</label>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleSetMode(true, true)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
              isRentable && isBuyable
                ? 'border-[#7A021D] bg-[#FDF8F4] text-[#7A021D] shadow-xs'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            }`}
          >
            Rent & Buy (Both)
          </button>
          <button
            type="button"
            onClick={() => handleSetMode(true, false)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
              isRentable && !isBuyable
                ? 'border-[#7A021D] bg-[#FDF8F4] text-[#7A021D] shadow-xs'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            }`}
          >
            Rent Only
          </button>
          <button
            type="button"
            onClick={() => handleSetMode(false, true)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
              !isRentable && isBuyable
                ? 'border-[#7A021D] bg-[#FDF8F4] text-[#7A021D] shadow-xs'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            }`}
          >
            Buy Only
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-1">
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
            Rental Fee (₹) {!isRentable ? <span className="text-red-500 font-semibold">(Disabled for Buy Only)</span> : <span className="text-neutral-400 font-normal">(Optional Override)</span>}
          </label>
          <Input
            type="number"
            min={0}
            disabled={!isRentable}
            placeholder={!isRentable ? 'Not rentable' : `Auto: ₹${calculatedRental.toLocaleString('en-IN')}`}
            value={isRentable ? customRent : ''}
            onChange={(e) => {
              const val = e.target.value;
              setField('rent_price_minor', val === '' ? null : toMinor(Number(val) || 0));
            }}
          />
          {isRentable ? (
            <p className="mt-1 text-[11px] text-neutral-500">
              Tier default: <span className="font-semibold text-neutral-700">₹{calculatedRental.toLocaleString('en-IN')}</span>. Clear to reset to auto tier.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-red-600 font-medium">
              Product is set to Buy Only. Rental is disabled.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
