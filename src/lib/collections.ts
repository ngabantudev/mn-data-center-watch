// src/lib/collections.ts
//
// Tiny collection helpers shared by the data registries. The metadata
// modules previously each built their lookup maps with
// `reduce((acc, m) => ({ ...acc, [m.k]: v }), {})`, which reallocates the
// whole accumulator on every item (O(n²) allocations) and had to be
// re-typed by hand at each call site. One helper, one mutation-in-place
// pass, one generic signature.

/** Builds a `Record<K, V>` from `items`, keyed by `key(item)`. */
export function indexBy<T, K extends PropertyKey, V>(
  items: readonly T[],
  key: (item: T) => K,
  value: (item: T) => V,
): Record<K, V> {
  const out = {} as Record<K, V>;
  for (const item of items) out[key(item)] = value(item);
  return out;
}

/** Counts how many `items` fall into each bucket returned by `key(item)`. */
export function countBy<T, K extends PropertyKey>(
  items: readonly T[],
  key: (item: T) => K,
): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
