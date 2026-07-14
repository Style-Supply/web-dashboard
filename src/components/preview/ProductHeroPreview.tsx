'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface PreviewImage {
  url: string;
  alt: string;
}

export interface ProductHeroPreviewProps {
  title: string;
  brand: string;
  originalPrice: number;
  currentPrice: number;
  description: string;
  images: PreviewImage[];
  sizeOptions: string[];
  unavailableSizes: string[];
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n) + '/-';
}

export default function ProductHeroPreview({
  title,
  brand,
  originalPrice,
  currentPrice,
  description,
  images,
  sizeOptions,
  unavailableSizes,
}: ProductHeroPreviewProps): React.ReactElement {
  const safeImages = images.length > 0 ? images : [{ url: '', alt: title }];
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const active = safeImages[Math.min(activeIndex, safeImages.length - 1)];
  const [selectedSize, setSelectedSize] = useState<string>(sizeOptions[0] ?? '');
  const [openSection, setOpenSection] = useState<string | null>(null);
  void currentPrice;

  return (
    <section className="px-4 pt-4 sm:px-5 md:px-8 lg:px-[45px] lg:pt-10">
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 lg:grid-cols-[1fr_1.1fr_1fr] lg:gap-8 xl:gap-12">
        <div className="order-1 flex flex-col justify-start lg:order-1 lg:pt-4">
          <div className="flex items-center justify-between lg:block">
            <p className="font-[var(--font-manrope)] text-[14px] sm:text-[15px] md:text-[16px] text-[#7A7A7A]">By {brand}</p>
            <span className="relative font-[var(--font-manrope)] text-[15px] sm:text-[16px] md:text-[18px] lg:hidden font-semibold text-[#25080A]">
              {formatPrice(originalPrice)}
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#25080A]" />
            </span>
          </div>
          <h1 className="mt-1 font-[var(--font-manrope)] text-[18px] sm:text-[24px] md:text-[30px] lg:text-[42px] xl:text-[52px] 2xl:text-[60px] font-medium leading-[1.1] tracking-[-0.02em] text-[#25080A]">
            {title}
          </h1>
          <div className="hidden lg:flex mt-5 items-center gap-2">
            <span className="relative font-[var(--font-manrope)] text-[20px] font-semibold text-[#25080A]">
              {formatPrice(originalPrice)}
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#25080A]" />
            </span>
          </div>
        </div>

        <div className="order-2 lg:order-2">
          <div className="relative aspect-[260/380] sm:aspect-[280/420] md:aspect-[320/480] lg:aspect-[370/600] w-full overflow-hidden rounded-[16px] sm:rounded-[18px] md:rounded-[24px] lg:rounded-[28px] bg-[#F6F3F0]">
            {active.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.url} alt={active.alt} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-sm text-neutral-400">No image</div>
            )}
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1 sm:gap-1.5 lg:hidden">
            {safeImages.slice(0, 6).map((image, idx) => (
              <button
                key={`thumb-mobile-${idx}`}
                onClick={() => setActiveIndex(idx)}
                className={`relative aspect-square overflow-hidden rounded-[6px] bg-[#FAFAFA] transition-all ${
                  activeIndex === idx ? 'ring-2 ring-[#25080A]' : 'ring-1 ring-[#E0E0E0]'
                }`}
              >
                {image.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image.url} alt={image.alt} className="absolute inset-0 h-full w-full object-contain" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="order-3">
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-5">
            <div>
              <div className="mb-2 flex items-center justify-between sm:mb-2.5 md:mb-3">
                <p className="font-[var(--font-manrope)] text-[14px] sm:text-[15px] md:text-[16px] lg:text-[18px] font-medium tracking-[-0.04em] text-black">Choose size</p>
              </div>
              <div className="flex flex-wrap items-center gap-[6px]">
                {sizeOptions.map((size) => {
                  const unavailable = unavailableSizes.includes(size);
                  const selected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => !unavailable && setSelectedSize(size)}
                      disabled={unavailable}
                      className={`flex h-[40px] w-[40px] items-center justify-center rounded-full border font-[var(--font-manrope)] text-[12px] font-normal tracking-[-0.02em] transition-colors
                        ${unavailable
                          ? 'border-[#E5E5E5] text-[#E5E5E5] cursor-not-allowed'
                          : selected
                          ? 'border-black border-[1px] text-black'
                          : 'border-[#E5E5E5] border-[1px] text-black hover:border-black'
                        }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="my-2 sm:my-2.5 md:my-3 border-[#C8C8C8]" />

            <div className="flex flex-row gap-2.5 sm:gap-3 md:gap-3">
              <button className="flex h-[56px] sm:h-[54px] md:h-[58px] lg:h-[60px] flex-1 items-center justify-center rounded-full bg-[#F7F4EF] font-[var(--font-manrope)] text-[17px] sm:text-[17px] md:text-[18px] lg:text-[20px] font-medium text-[#25080A]">
                Save to Closet
              </button>
              <button className="flex h-[56px] sm:h-[54px] md:h-[58px] lg:h-[60px] flex-1 items-center justify-center rounded-full bg-[#7A021D] font-[var(--font-manrope)] text-[17px] sm:text-[17px] md:text-[18px] lg:text-[20px] font-medium text-white">
                Add to Bag
              </button>
            </div>

            <p className="text-center font-[var(--font-manrope)] text-[12px] sm:text-[13px] md:text-[14px] lg:text-[16px] text-[#999999]">*15% off your first order</p>

            <div>
              {[
                { key: 'description', title: 'Description', content: description || '—' },
                { key: 'shipping', title: 'Shipping', content: 'Free delivery in metro cities within 48 hours. Easy pickup for returns.' },
                { key: 'delivery', title: 'Delivery & Returns', content: 'Swap or rotate your item any time during your subscription cycle.' },
              ].map((item) => {
                const isOpen = openSection === item.key;
                return (
                  <div key={item.key}>
                    <hr className="border-[#C8C8C8]" />
                    <button
                      onClick={() => setOpenSection((prev) => (prev === item.key ? null : item.key))}
                      className="flex w-full items-center justify-between py-2.5 sm:py-3 md:py-3.5 lg:py-4 text-left"
                    >
                      <span className="font-[var(--font-manrope)] text-[14px] sm:text-[15px] md:text-[16px] lg:text-[18px] font-medium text-[#25080A]">{item.title}</span>
                      <span className="font-[var(--font-manrope)] text-[16px] sm:text-[18px] md:text-[20px] lg:text-[22px] text-[#25080A]">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <p className="pb-2.5 sm:pb-3 md:pb-3.5 lg:pb-4 font-[var(--font-manrope)] text-[13px] sm:text-[13px] md:text-[14px] lg:text-[15px] leading-[1.5] lg:leading-relaxed text-[#666666]">{item.content}</p>
                    )}
                  </div>
                );
              })}
              <hr className="border-[#C8C8C8]" />
            </div>

            <div className="flex flex-col items-center text-center lg:items-start lg:text-left pt-2 sm:pt-2.5 md:pt-3 lg:pt-4">
              <h3 className="font-[var(--font-manrope)] text-[32px] sm:text-[36px] md:text-[42px] lg:text-[28px] xl:text-[32px] font-medium leading-[1.25] tracking-[-0.05em] text-[#25080A]">
                Rent with Confidence
              </h3>
              <p className="mt-3 sm:mt-4 lg:mt-2 font-[var(--font-manrope)] text-[14px] sm:text-[15px] lg:text-[14px] font-medium leading-[1.4] tracking-[-0.04em] text-[#2E010D] max-w-[250px] sm:max-w-[320px] lg:max-w-full">
                If something doesn&apos;t fit quite right, we&apos;ll make it right in your next shipment.
              </p>
              <Link
                href="/faq"
                className="mt-5 sm:mt-6 lg:mt-4 inline-flex items-center justify-center rounded-full bg-[#7A021D] h-[50px] px-[24px] sm:px-[32px] font-[var(--font-manrope)] text-[15px] sm:text-[15px] md:text-[16px] font-medium tracking-[-0.03em] text-white min-w-[188px] sm:min-w-[220px] lg:min-w-0 lg:w-auto"
              >
                Know More
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:grid mt-7 grid-cols-6 gap-3">
        {safeImages.slice(0, 6).map((image, idx) => (
          <button
            key={`thumb-${idx}`}
            onClick={() => setActiveIndex(idx)}
            className={`relative aspect-square overflow-hidden rounded-[6px] sm:rounded-[7px] md:rounded-[8px] bg-[#FAFAFA] transition-all ${
              activeIndex === idx ? 'ring-2 ring-[#25080A]' : 'ring-1 ring-[#E0E0E0]'
            }`}
          >
            {image.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.url} alt={image.alt} className="absolute inset-0 h-full w-full object-contain" />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
