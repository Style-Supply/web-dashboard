'use client';

import type { ProductPayload, ProductImage } from '@/types/product';
import ProductHeroPreview from './ProductHeroPreview';
import { formStateToPreviewProduct } from './adapter';

interface PreviewPaneProps {
  state: ProductPayload;
  images: ProductImage[];
}

export default function PreviewPane({ state, images }: PreviewPaneProps): React.ReactElement {
  const props = formStateToPreviewProduct(state, images);
  // Render the preview at a fixed 1440px desktop width and scale it down to
  // fit whatever column the pane is mounted in. This keeps the storefront
  // layout pixel-accurate regardless of the dashboard's split-pane width.
  return (
    <div className="w-full overflow-hidden">
      <div
        className="bg-white origin-top-left"
        style={{
          width: 1440,
          transform: 'scale(var(--preview-scale, 1))',
          transformOrigin: 'top left',
        }}
        ref={(el) => {
          if (!el) return;
          const parent = el.parentElement;
          if (!parent) return;
          const update = (): void => {
            const scale = parent.clientWidth / 1440;
            el.style.setProperty('--preview-scale', String(scale));
            el.style.height = `${el.scrollHeight * scale}px`;
          };
          update();
          const ro = new ResizeObserver(update);
          ro.observe(parent);
          ro.observe(el);
        }}
      >
        <ProductHeroPreview {...props} />
      </div>
    </div>
  );
}
