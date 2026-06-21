# Supabase SQL migration order

Apply **only** via `scripts/apply-production-setup.mjs` (requires `SUPABASE_ACCESS_TOKEN`).

```text
1. supabase-production-hardening.sql
2. supabase-social-network.sql
3. supabase-security-audit-fixes.sql
4. supabase-identity-hardening.sql
5. supabase-launch-hardening.sql
6. supabase-participation-hardening.sql   ← ban / invite-only / call permissions
7. supabase-private-media.sql             ← private PM bucket
8. supabase-room-member-roles.sql         ← per-room mod/vip + promote RPC
9. supabase-role-policy-v2.sql            ← host + temp grants + grant matrix
10. supabase-private-rooms.sql            ← password rooms + creation quota
11. supabase-moderation-hardening.sql     ← P0: typed bans + moderation RPC
12. supabase-moderation-p1.sql             ← P1: kick + layout server tweaks
13. supabase-p2-owner-settings-public.sql  ← P2: public settings mirror + admin-only owner_settings
14. supabase-moderation-p2.sql             ← P2: shadow ban server + system messages RPC
15. supabase-media-performance-fix.sql     ← media URL RLS + storage bucket limits
```

**Do not** run `supabase-storage.sql` after step 4 — it overwrites folder-scoped upload policies.

## Verify after apply

```bash
cp .env.example .env.local   # fill Supabase keys
npm run verify:hardening
```

## Owner roles

Store owner/admin in `public.user_roles` only — not in `user_metadata.role`.

```sql
select * from public.user_roles;
```

## Participation-only patch

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/apply-participation-hardening-only.mjs
```

## Room member roles (per-room mod/vip)

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/apply-room-member-roles.mjs
```

Or paste `supabase-room-member-roles.sql` in Supabase SQL Editor.

## Private password rooms

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/apply-private-rooms.mjs
```

Or paste `supabase-private-rooms.sql` in Supabase SQL Editor.

## Moderation hardening (P0)

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/apply-moderation-hardening.mjs
```

Or paste `supabase-moderation-hardening.sql` in Supabase SQL Editor.

## Moderation P1 (kick)

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/apply-moderation-p1.mjs
```

## P2 owner settings public mirror

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/apply-p2-owner-settings-public.mjs
```

## Moderation P2 (shadow ban + system messages)

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/apply-moderation-p2.mjs
```

## Media performance fix (URL RLS + bucket limits)

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/apply-media-performance-fix.mjs
```
