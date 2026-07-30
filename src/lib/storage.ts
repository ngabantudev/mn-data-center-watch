// src/lib/storage.ts
//
// `localStorage` behind a try/catch, once. Every access to it has to be guarded
// — Safari's private mode throws on `getItem`, not just on write, and an
// unguarded read in an island's init kills the whole island — so the same
// four-line `try { … } catch {}` had been written out eight times across six
// files. Two of those eight were verbatim duplicates of each other twelve lines
// apart.
//
// Nothing here throws, and nothing here reports failure: a visitor with storage
// blocked should get a working map that forgets its panel state, which is what
// returning the caller's fallback does.

/** Reads a string, or `fallback` if it's absent, invalid, or unreadable. */
export function readStored<T extends string>(
  key: string,
  isValid: (value: string) => value is T,
  fallback: T,
): T;
export function readStored(key: string): string | null;
export function readStored<T extends string>(
  key: string,
  isValid?: (value: string) => value is T,
  fallback?: T,
): T | string | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback ?? null;
    if (!isValid) return stored;
    if (isValid(stored)) return stored;
  } catch {}
  return fallback ?? null;
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/**
 * The three collapsible panels each persist one boolean, and each had invented
 * its own encoding: the filters and news rails wrote `"true"`/`"false"`, the
 * campaign banner `"1"`/`"0"`. Reading accepts both so nobody's panel forgets
 * its state across this change; writing settles on one.
 */
export function readStoredFlag(key: string, fallback = false): boolean {
  const stored = readStored(key);
  if (stored === null) return fallback;
  return stored === 'true' || stored === '1';
}

export function writeStoredFlag(key: string, value: boolean): void {
  writeStored(key, String(value));
}
