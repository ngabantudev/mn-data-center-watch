// src/lib/domReady.ts
//
// Every client island in this app boots the same way: run its init now if the
// document is already parsed, otherwise on DOMContentLoaded, and again on
// `astro:page-load` so a client-side navigation re-wires it. That was eight
// lines copy-pasted into seven components, which is seven places to forget the
// `astro:page-load` half — and an island that misses it works on first load and
// silently dies after any navigation.

/**
 * Runs `init` once the document is parsed, and again after every Astro
 * navigation. Init functions must therefore be idempotent — each one already
 * re-queries its own elements and drops its previous listeners.
 */
export function onReady(init: () => void): void {
  document.addEventListener('astro:page-load', init);
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
}
