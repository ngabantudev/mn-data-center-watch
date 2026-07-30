# MN Data Center Watch

An interactive map and live legislative tracker for data center development in
Minnesota, built for the people who bear its costs: utility ratepayers, water and
environmental advocates, clean-energy campaigners, and neighbours fighting a
rezoning they only heard about last week.

The animating problems are water consumption, electricity bills, grid
reliability, and tax breaks negotiated behind non-disclosure agreements. The site
exists to make those legible without needing a lobbyist, a Westlaw account, or
the patience to read a 300-page omnibus tax bill.

## What it does

**Maps every facility we can source.** Each site carries a development status
(operational, under construction, proposed, paused, rejected/withdrawn), a
separate environmental-review axis (EAW contested, EIS ordered, halted by court
order), and a size tier. Overlays put a facility in context rather than floating
it on a blank grid: protected lands, drinking water supply areas, city
boundaries, and electric co-op / utility service territories. Four basemap themes
via OpenFreeMap, with vector tiles served as PMTiles.

**Translates megawatts into something arguable.** The ratepayer panel converts a
facility's nameplate capacity into annual consumption, an equivalent number of
Minnesota households, its share of total state retail electricity sales, and a
comparison to a real Minnesota city — plus the serving utility and who owns it.

It deliberately reports **no dollar figure**, and that restraint is the point.
Turning a site's MW draw into "$N on your monthly bill" would require the
utility's rate case, its cost-allocation settlement, and that site's
interconnection agreement — none of which are public for most projects on this
map. So the panel reports *load*, *share*, and *who decides who pays*, all
defensible from public record. Where a serving utility publishes no account
count, the utility-relative share is `null` rather than estimated. The reasoning
is written out at the top of `src/data/mnRatepayerBaseline.ts`.

**Tracks the legislature, live.** The "Statewide Campaign Goals" panel discovers
bills at request time from the [Open States](https://open.pluralpolicy.com/) API
— there is no list of bill numbers in this repository. It searches the running
session for the phrase "data center" and sorts what comes back into three stages:

| Stage | Meaning |
| --- | --- |
| **Proposed** | Introduced, no action yet beyond gaining authors |
| **Advancing** | Cleared a committee or reached a reading |
| **Passed** | Passed a floor vote |

Two things about that panel are deliberate and worth knowing:

- **It separates "about data centers" from "mentions data centers."** Bills whose
  *title* names data centers are the headline list. Bills that only matched the
  full-text search sit behind a disclosure, because those are different claims
  and only one of them is safe to make.
- **It surfaces blindspots.** The bills that change the rules for data centers
  *without* saying so in the title are the ones that pass. At the time of
  writing, the only bill in the entire result set to pass a floor vote was an
  omnibus state-government bill whose title mentions nothing about data centers
  at all — invisible to anyone searching for "data center bills."

**Points at the ways in.** Live PUC dockets open for public comment, a link to
the Commission's eDockets system, and a draft email to your own state legislators
— a draft you are expected to edit, because offices weight a constituent's own
sentence far above identical mass mail.

**Surfaces local coverage.** A news panel queries Google News for Minnesota data
center reporting across 24-hour, 7-day, 30-day and 1-year windows, filtered on
both a data-center term and a Minnesota term so national AI-boom coverage doesn't
drown out a zoning fight in Farmington.

## Principles

These are load-bearing, not decoration. Several are enforced by comments in the
code explaining why an obvious-looking change would be wrong.

**Public sources only, and honest gaps.** Where a fact isn't in the record, the
UI says so instead of inferring a plausible value. A bill status that can't be
fetched renders as unavailable, never as "no action." An empty bill list is
labelled as "we could not reach the API," because an empty list would otherwise
read as "the legislature is quiet" — a false statement about the world.

**Facts, not conclusions.** The tracker reports "session adjourned 2026-05-20"
rather than "this bill is dead." The verbatim latest action always appears
alongside the derived stage, so a reader can see that "Author added Jones" is not
progress without taking our word for it.

**No personal data.** No accounts, no forms, nothing asked of anybody. Worker
request logs are switched off in `wrangler.jsonc` specifically so IP addresses
are never held — the cost of that trade is documented there. Location is
strictly opt-in from a single button, and coordinates are rounded to about a
kilometre *in the browser* before they are sent anywhere.

**Colour is never the only signal.** Every status colour ships with a text label,
and status hexes are measured against both themes rather than picked by eye —
see the contrast notes in `src/data/legalStatusMeta.ts` and
`src/data/billStageMeta.ts`.

## Architecture

Astro in `server` output mode on the Cloudflare Workers adapter. The map page is
prerendered; anything live is a per-request API route.

```
src/
├─ components/
│  ├─ campaign/    Statewide Campaign Goals banner + action dialog
│  ├─ map/         MapLibre map, filters, facility detail, per-site CTA
│  ├─ news/        Coverage panel
│  ├─ filter/      Status / legal / project / size / layer controls
│  └─ ui/          Accordion, map theme selector
├─ data/           Registries: facilities, status + legal + stage + size meta,
│                  map layers and styles, utilities, ratepayer baselines
├─ lib/            edgeCache, openStates client, bill classifier, news feed,
│                  overlayLayers (owns the PMTiles overlays on the map),
│                  pure helpers shared by routes and client islands
├─ pages/
│  ├─ index.astro  Prerendered map page
│  └─ api/         legislation · legislators · news  (all per-request)
└─ styles/         Theme tokens for the MN-portal light theme and dark theme
```

### Caching is the interesting part

`src/lib/edgeCache.ts` exists because of a measured constraint: **Open States
allows 10 requests per minute.** Not a daily quota — 17 of 30 back-to-back calls
return `429`. One cold refresh of the bill tracker spends 4 of those 10, so the
thing to prevent is refreshes overlapping.

`Cache-Control: s-maxage` alone does not do it, because that needs a zone cache
in front of the Worker and a `workers.dev` deployment has none. So the cache
layers, cheapest first: isolate memory → single-flight (concurrent requests share
one upstream refresh) → the Cache API → optionally KV, if a `LEGISLATION_CACHE`
binding is present.

Two properties matter more than the layers:

- **A failed refresh serves the last good copy**, stamped with its age, rather
  than an empty list.
- **A failure backs off** instead of letting every visitor retry a dead API. The
  backoff is per-caller, because the right value depends on why the upstream
  failed: a rate-limited API needs the full minute, while a dropped connection
  should be retried in seconds.

## Development

Requires Node ≥ 22.12.

```sh
npm install
npm run dev        # localhost:4321
npm run build
npm run preview
```

The dev server also supports background mode, which is what `AGENTS.md` assumes:

```sh
astro dev --background
astro dev status
astro dev logs
astro dev stop
```

### Configuration

One optional secret, `OPENSTATES_API_KEY` — free, from
[open.pluralpolicy.com](https://open.pluralpolicy.com/). Copy `.env.example` to
`.env` for local work, or `.dev.vars` for the Cloudflare platform proxy. In
production it is a Worker secret:

```sh
wrangler secret put OPENSTATES_API_KEY
```

Without it the tracker degrades honestly — it says live bill tracking isn't
configured on this deployment rather than showing an empty list. See
`.env.example` for the rate-limit details and the query pitfalls worth knowing
before changing the search.

## Deployment

Cloudflare Workers, via GitHub Actions:

| Workflow | Trigger | Does |
| --- | --- | --- |
| `pr-preview.yml` | pull request | Builds, uploads a **preview version**, smoke tests it, comments the URL |
| `deploy.yml` | push to `main` | Builds, deploys to production, then verifies the live routes |

Previews use `wrangler versions upload`, which gets its own URL and takes **no**
production traffic, so a preview can never affect the live site. `deploy.yml` is
the only workflow that touches production.

Both need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.
Create the token from the "Edit Cloudflare Workers" template, and keep its
Workers KV Storage permission — the Astro adapter binds a `SESSION` namespace,
and a token without it fails at upload with an error that doesn't obviously point
at KV.

## Data sources

- Facility records — public filings, permit records and reporting, in
  `src/data/dataCenters.ts`. Records carry an optional `publicRecord` citation
  (title + URL); where one is absent, that is a gap to fill rather than a fact
  to assume
- Legislation, sessions and legislators — [Open States v3](https://v3.openstates.org/)
- Basemaps — [OpenFreeMap](https://openfreemap.org/), OpenStreetMap data
- Coverage — Google News RSS
- PUC proceedings — hand-kept, because eDockets publishes no JSON API to read
  them from. The one part of the site that still needs a human to notice a new
  docket.

## Contributing

The bar for a facility record or a claim about a bill is a public source. If the
record doesn't say it, the site shouldn't either — and rendering the gap is
always preferable to filling it with something plausible.
