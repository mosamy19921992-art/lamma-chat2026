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
