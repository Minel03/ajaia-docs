/** Normalize a Supabase relation that may be returned as one row or a row array. */
export function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}
