// src/lib/htmlEntities.ts
//
// Decoding, the counterpart to `escapeHtml` in `~/lib/popupHtml.ts`.
//
// It lives on its own rather than beside that one because the two are not a
// pair of popup helpers: escaping is what a *card* does on its way onto the
// page (which is why it sits in the popups module), while decoding is what a
// *reader* of third-party data does on the way in, before the value is text at
// all. Two callers, neither of them a popup:
//
//   * `~/lib/protectedLands.ts` parses PAD-US attributes out of a KML balloon
//     the tile archive carries as pre-rendered HTML;
//   * `~/lib/newsFeed.ts` reads headlines out of Google News RSS, where XML
//     requires an ampersand to arrive as `&amp;` — so "Q&A: Minnesota
//     environmental group leader talks data center review" was reaching the
//     news rail as "Q&amp;A: …" and rendering with the entity showing.
//
// Both then hand the decoded value to `textContent` or to `escapeHtml`, so the
// round trip is deliberate: decode what the publisher encoded, re-escape what
// we emit, and never pass an upstream string through as markup on the strength
// of its own escaping.

/** The named entities these two sources actually use. Anything else is left
 *  exactly as it arrived rather than guessed at. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (whole, ref: string) => {
    if (!ref.startsWith('#')) return NAMED_ENTITIES[ref.toLowerCase()] ?? whole;
    const code = ref[1]?.toLowerCase() === 'x'
      ? Number.parseInt(ref.slice(2), 16)
      : Number.parseInt(ref.slice(1), 10);
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff
      ? String.fromCodePoint(code)
      : whole;
  });
}
