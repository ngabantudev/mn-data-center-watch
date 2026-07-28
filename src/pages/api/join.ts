// src/pages/api/join.ts
//
// Volunteer signup from the facility detail drawer's campaign CTA. Validates
// name / ZIP / email, routes the volunteer to their regional organizing node,
// and returns that node so the drawer can tell them where they landed.
//
// Runs per-request (Cloudflare adapter), like ~/pages/api/news.ts.

import type { APIRoute } from 'astro';
import { chapterForZip, isValidZip } from '~/data/organizingChapters';

export const prerender = false;

/** Loose on purpose — we reject obvious typos, not unusual-but-valid addresses. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_NAME = 120;
const MAX_EMAIL = 254;
/** Free-text the drawer sends along so organizers know which site drew them in. */
const MAX_SOURCE = 200;

function bad(message: string, field?: string): Response {
  return new Response(JSON.stringify({ ok: false, message, field }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad('Could not read that submission. Please try again.');
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const asString = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  const name = asString(raw.name);
  const zip = asString(raw.zip);
  const email = asString(raw.email);
  const sourceProject = asString(raw.sourceProject).slice(0, MAX_SOURCE);

  if (!name) return bad('Please enter your name.', 'name');
  if (name.length > MAX_NAME) return bad('That name is too long.', 'name');
  if (!isValidZip(zip)) return bad('Please enter a 5-digit ZIP code.', 'zip');
  if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
    return bad('Please enter a valid email address.', 'email');
  }

  const chapter = chapterForZip(zip);

  // TODO(persistence): there is no KV/D1 binding on this Worker yet, so the
  // signup is only logged (Workers observability is enabled in wrangler.jsonc).
  // Add a binding — or a POST to the campaign CRM — here before promoting this
  // form as the real intake path; until then these records are not durable.
  console.log(
    JSON.stringify({
      event: 'volunteer_signup',
      chapterId: chapter.id,
      zip,
      email,
      name,
      sourceProject,
    }),
  );

  return new Response(
    JSON.stringify({
      ok: true,
      chapter: { id: chapter.id, name: chapter.name, focus: chapter.focus },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
