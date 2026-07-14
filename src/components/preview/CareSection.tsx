"use client";

import Link from "next/link";

interface CareSectionProps {
  compactSpacing?: boolean;
}

export default function CareSection({ compactSpacing = false }: CareSectionProps = {}) {
  return (
    <section className={`px-4 sm:px-6 lg:px-12 bg-white ${compactSpacing ? "py-0" : "py-12 sm:py-16 lg:py-24"}`}>
      <div className="mx-auto w-full max-w-[340px] sm:max-w-[600px] lg:max-w-[720px] flex flex-col items-center text-center">
        <div className="relative w-full flex flex-col items-center">
          <h2 className="font-[var(--font-manrope)] font-medium text-[52px] sm:text-[72px] lg:text-[84px] text-[#25080A] leading-[1.0] tracking-[-0.05em] relative z-10">
            We take care
            <br />
            of your clothes,
          </h2>
          <div className="relative z-0 my-[-12px] sm:my-[-18px] lg:my-[-20px] w-[280px] h-[130px] sm:w-[440px] sm:h-[180px] lg:w-[520px] lg:h-[210px] rounded-[60px] sm:rounded-[80px] lg:rounded-[96px] bg-[rgba(0,0,0,0.05)] p-[10px] sm:p-[13px] rotate-[-8deg]">
            <div className="w-full h-full rounded-[50px] sm:rounded-[68px] lg:rounded-[84px] overflow-hidden bg-[#221D1D]" />
          </div>
          <h2 className="font-[var(--font-manrope)] font-medium text-[52px] sm:text-[72px] lg:text-[84px] text-[#25080A] leading-[1.0] tracking-[-0.05em] relative z-10">
            so you don&apos;t
            <br />
            have to.
          </h2>
        </div>

        <p className="mt-6 sm:mt-8 font-[var(--font-manrope)] font-medium text-[16px] sm:text-[18px] lg:text-[24px] text-black tracking-[-0.02em] leading-[1.4] max-w-[260px] sm:max-w-[300px] lg:max-w-[340px]">
          Shaping a more sustainable future of fashion.
        </p>

        <Link
          href="/care"
          className="mt-6 sm:mt-8 font-[var(--font-manrope)] font-bold inline-flex items-center justify-center rounded-full bg-[#6B0B23] text-[#F8F8FF] w-[200px] h-[56px] sm:w-[220px] sm:h-[60px] lg:w-[220px] lg:h-[67px] text-[16px] sm:text-[18px] lg:text-[24px] tracking-[-0.06em] transition-all duration-300 active:scale-[0.97]"
        >
          Know more
        </Link>
      </div>
    </section>
  );
}
