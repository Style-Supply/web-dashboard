export function isLikelyHttpUrl(str: string): boolean {
  if (!str) return false;
  try {
    const u = new URL(str.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
