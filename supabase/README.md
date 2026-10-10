# OnePage cloud persistence

Configured project: `onepage` in the free `onepage` organization, reference
`bbthquklafqgggnylamt`. Dashboard:
https://supabase.com/dashboard/project/bbthquklafqgggnylamt

The migration has been applied. Local credentials are in ignored `.env.local`;
Vercel's OnePage Production and Preview environments have the same server-only
variables. Application deployments use these variables for cloud persistence.

Apply `migrations/202610090001_pages.sql` in the OnePage Supabase project's SQL
editor, then set these **server-only** variables in `.env.local` and the Vercel
OnePage project (Production and Preview):

- `SUPABASE_URL`: project API URL
- `SUPABASE_SERVICE_ROLE_KEY`: service-role/secret API key

Never use a `VITE_` prefix for either credential. The frontend talks only to the
same-origin `/api/pages` endpoint; the server key is excluded from browser bundles.
Redeploy after configuring Vercel, and restart local Vite after changing env vars.

Each publication stores one row in `public.onepage_pages` with a random 12-character
slug, profile/theme/link data, and creation/update timestamps. Avatar JPEGs live in
the public `onepage-avatars` bucket. The dashboard's Table Editor can find a page
by its slug; the public URL is `https://onepage.chengzhuo.work/#/p/<slug>`.

No registration or login is required. A separate random 256-bit editing credential
is saved only in the publishing browser's `onepage.published.v1` localStorage.
Only its SHA-256 hash is stored in the database. Public GET responses and sharing
URLs never include that credential. Anyone with a public URL can view the page,
but cannot edit it. Clearing browser data loses editing access; existing public
pages remain available. Resetting the demo creates a new page on the next publish
and does not delete the previous public page.

Legacy `?d=` snapshot URLs remain readable. Existing local publications are copied
to Supabase when this version runs; it generates a new cloud URL and preserves the
legacy snapshot URL's behavior. Editing updates the same cloud slug. Save failures
show an explicit retry action and preserve local content; failed initial publishes
are retained separately as drafts.

Verification:

```sh
npx tsc --noEmit
node --import tsx --test server/pages.test.ts server/backend.test.ts
npm run build
```

Before public launch, also verify a real create/read/update from another browser,
unauthorized edit rejection, public avatar rendering, and that the RLS table cannot
be queried directly with a publishable/anon key. The public creation endpoint should
have Vercel Firewall rate limits enabled for production traffic.

Verified against the configured database: create/read/update with a fixed ID,
unauthorized edit rejection, public JPEG avatar delivery, and public-key table
access denial (`42501`). The complete local wizard publishes a short URL, and
the public page loads from another origin without the editing credential.
