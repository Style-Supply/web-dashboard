export function toMinor(rupees: number): number {
  return Math.round(rupees * 100);
}

export function fromMinor(minor: number): number {
  return minor / 100;
}

export function formatINR(minor: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(fromMinor(minor));
}
