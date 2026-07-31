// src/lib/domReady.ts
//
// Ten of this app's eleven client islands boot the same way: run init now if
// the document is already parsed, otherwise on DOMContentLoaded, and again on
// `astro:page-load`. That was eight lines copy-pasted into all ten.
// (CampaignBanner.astro is the eleventh island and doesn't use this — it inits
// at module scope, guarded on finding its own root.)
//
// ON `astro:page-load`: this site has one page and no `<ClientRouter />`, so
// nothing dispatches that event today and the second registration below is
// dormant. It stays, and the islands stay idempotent, because it costs one
// listener and it's the difference between adding view transitions being a
// one-line change and being a hunt through eight islands for state that
// survived a navigation it shouldn't have. Treat it as a standing invariant to
// keep, not as a live code path — and don't reason about current behaviour from
// it, which is a mistake already made once in this file's own comments.

/**
 * Runs `init` once the document is parsed, and again after every Astro
 * navigation, should this site ever gain them. Init functions must therefore be
 * idempotent — each one already re-queries its own elements and drops its
 * previous listeners.
 */
export function onReady(init: () => void): void {
  document.addEventListener('astro:page-load', init);
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
}
