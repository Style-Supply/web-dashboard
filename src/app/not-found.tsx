import Link from 'next/link';

export default function NotFound(): React.ReactElement {
  return (
    <div className="p-12">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-neutral-600">That page does not exist.</p>
      <Link href="/products" className="mt-4 inline-block text-[color:var(--color-primary)] underline">
        Back to products
      </Link>
    </div>
  );
}
