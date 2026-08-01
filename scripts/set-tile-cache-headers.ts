// scripts/set-tile-cache-headers.ts
//
// Puts a `Cache-Control` header on every PMTiles archive in the tile bucket.
//
// WHY THIS IS A SCRIPT AND NOT A ONE-OFF. R2 stores `Cache-Control` as *object
// metadata*, so it is set at upload time and there is no bucket-level default.
// Every re-upload therefore drops it — including the PAD-US re-tiling that
// ~/data/mapLayers.ts recommends, which is the single biggest performance win
// available to this map and the exact moment someone would forget. This makes
// restoring it one command instead of a remembered checklist.
//
// It is also idempotent: an archive that already carries the right header is
// skipped, so running it after every upload costs one HEAD per layer and
// nothing else.
//
// WHY NOT `immutable`, WHICH IS THE USUAL ANSWER FOR TILES. These filenames are
// stable across re-uploads — `PADUS4_1Combined_StateMN.pmtiles` is the same URL
// before and after a re-tile — so a far-future immutable directive would hide
// new data from returning visitors for as long as it was set. A day is a large
// win over the nothing that was there before, and the bucket already sends an
// `ETag`, so after expiry the browser revalidates and gets a cheap 304 rather
// than re-downloading.
//
// MEASURED, before shipping this: with no header, a reload re-fetched all 8 of
// a session's tile requests from the network. With it, 7 of 8 came from the
// browser cache. Range requests (which is all PMTiles issues) do cache — the
// 206s are served out of the entry the archive's own cache entry provides.
//
// Usage:
//   npx tsx scripts/set-tile-cache-headers.ts <bucket-name> [--force]
//
// The bucket name is an argument rather than a constant on purpose: it is
// account-specific and nothing in this repo should have to know it. Find it in
// the Cloudflare dashboard under R2, or with `npx wrangler r2 bucket list`.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { MAP_LAYER_META, tileUrlFor } from "../src/data/mapLayers";

const run = promisify(execFile);

/** One day. See the note above on why this is not `immutable`. */
const CACHE_CONTROL = "public, max-age=86400";

/** Scratch space for the download/upload round trip. Removed on the way out. */
const WORK_DIR = ".tile-cache-headers";

const force = process.argv.includes("--force");
const bucket = process.argv.slice(2).find((a) => !a.startsWith("--"));

if (!bucket) {
  console.error(
    "Usage: npx tsx scripts/set-tile-cache-headers.ts <bucket-name> [--force]\n" +
      "\nFind the bucket with: npx wrangler r2 bucket list",
  );
  process.exit(1);
}

interface Head {
  status: number;
  cacheControl: string | null;
  contentType: string;
  etag: string | null;
  bytes: number | null;
}

async function head(url: string): Promise<Head> {
  const res = await fetch(url, { method: "HEAD" });
  const etag = res.headers.get("etag")?.replace(/"/g, "") ?? null;
  const len = res.headers.get("content-length");
  return {
    status: res.status,
    cacheControl: res.headers.get("cache-control"),
    // Preserved rather than assumed: a `put` replaces metadata wholesale, so
    // not passing this back would silently drop the object's content type.
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
    etag,
    bytes: len ? Number(len) : null,
  };
}

/**
 * Downloads and checks the bytes are what R2 says they are.
 *
 * R2's ETag is the content MD5 for single-part uploads, which these are — a
 * multipart upload's ETag carries a `-<n>` suffix, and none of these do. Where
 * that holds this is a real integrity check; where it doesn't, fall back to the
 * length, because uploading a truncated archive would break the layer for
 * everyone until someone noticed.
 */
async function download(url: string, dest: string, expected: Head): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);

  if (expected.bytes !== null && buf.byteLength !== expected.bytes) {
    throw new Error(`size mismatch: got ${buf.byteLength}, expected ${expected.bytes}`);
  }
  if (expected.etag && !expected.etag.includes("-")) {
    const md5 = createHash("md5").update(buf).digest("hex");
    if (md5 !== expected.etag) {
      throw new Error(`md5 mismatch: got ${md5}, expected ${expected.etag}`);
    }
  }
  // PMTiles archives start with the ASCII magic "PMTiles". Cheap guard against
  // having downloaded an error page with a 200.
  if (buf.subarray(0, 7).toString("ascii") !== "PMTiles") {
    throw new Error("not a PMTiles archive (bad magic bytes)");
  }
}

async function upload(key: string, file: string, contentType: string): Promise<void> {
  // `--remote` is not optional: wrangler's r2 commands default to the local
  // simulator and would report success while changing nothing in production.
  // execFile with an argument array, so filenames containing parentheses —
  // the DWSMA archive does — need no shell quoting.
  await run("npx", [
    "wrangler",
    "r2",
    "object",
    "put",
    `${bucket}/${key}`,
    "--file",
    file,
    "--cache-control",
    CACHE_CONTROL,
    "--content-type",
    contentType,
    "--remote",
  ]);
}

async function main(): Promise<void> {
  await mkdir(WORK_DIR, { recursive: true });

  let changed = 0;
  let skipped = 0;
  let missing = 0;
  const failures: string[] = [];

  for (const layer of MAP_LAYER_META) {
    const url = tileUrlFor(layer);
    const key = decodeURIComponent(new URL(url).pathname.slice(1));
    const label = `${layer.id} (${key})`;

    let before: Head;
    try {
      before = await head(url);
    } catch (error) {
      failures.push(`${layer.id}: HEAD failed — ${(error as Error).message}`);
      console.error(`✗ ${label} — could not reach the bucket`);
      continue;
    }

    if (before.status === 404 || before.status === 403) {
      // A registered layer whose archive isn't uploaded yet is a known state —
      // mapLayers.ts documents the co-op territories as exactly this — and the
      // map already handles it by disabling that row. Not a failure.
      console.log(`· ${label} — not in the bucket yet, skipping`);
      missing += 1;
      continue;
    }

    if (before.cacheControl === CACHE_CONTROL && !force) {
      console.log(`· ${label} — already "${CACHE_CONTROL}"`);
      skipped += 1;
      continue;
    }

    const file = join(WORK_DIR, key);
    try {
      await download(url, file, before);
      await upload(key, file, before.contentType);

      const after = await head(url);
      if (after.cacheControl !== CACHE_CONTROL) {
        throw new Error(`header did not take (got ${after.cacheControl ?? "none"})`);
      }
      if (after.etag !== before.etag) {
        throw new Error(`content changed! etag ${before.etag} -> ${after.etag}`);
      }
      console.log(
        `✓ ${label} — ${before.cacheControl ?? "no header"} -> "${CACHE_CONTROL}" (${after.bytes} bytes, unchanged)`,
      );
      changed += 1;
    } catch (error) {
      failures.push(`${layer.id}: ${(error as Error).message}`);
      console.error(`✗ ${label} — ${(error as Error).message}`);
    } finally {
      await rm(file, { force: true });
    }
  }

  await rm(WORK_DIR, { recursive: true, force: true });

  console.log(
    `\n${changed} updated, ${skipped} already correct, ${missing} not uploaded yet.`,
  );
  if (failures.length > 0) {
    console.error(`\n${failures.length} failed:\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
}

await main();
