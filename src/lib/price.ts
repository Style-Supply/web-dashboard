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

export function calculateTierRentalFee(mrpRupees: number): number {
  if (mrpRupees <= 0) return 0;
  if (mrpRupees <= 9999) return 1000;
  if (mrpRupees <= 24999) return Math.round(mrpRupees * 0.10);
  if (mrpRupees <= 39999) return 2500;
  if (mrpRupees <= 99999) return 4000;
  return 8000;
}
