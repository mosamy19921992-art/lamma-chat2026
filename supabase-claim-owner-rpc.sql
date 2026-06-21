-- Self-service owner claim (run once in Supabase SQL Editor OR via ensure-owner-role.mjs)
-- Lets the logged-in owner account insert their own user_roles row without prior owner access.

create or replace function public.claim_owner_role_for_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
  v_email text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if exists (
    select 1 from public.user_roles
    where role in ('owner', 'malek', 'المالك')
      and user_id <> v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'owner_already_claimed');
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null or lower(trim(v_email)) <> lower(trim(p_email)) then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch', 'email', v_email);
  end if;

  insert into public.user_roles (user_id, role)
  values (v_uid, 'owner')
  on conflict (user_id) do update
    set role = 'owner', updated_at = timezone('utc'::text, now());

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"owner"}'::jsonb
  where id = v_uid;

  return jsonb_build_object('ok', true, 'user_id', v_uid, 'email', v_email);
end;
$$;

revoke all on function public.claim_owner_role_for_email(text) from public;
grant execute on function public.claim_owner_role_for_email(text) to authenticated;

alter table public.owner_settings
  add column if not exists universal_style_config jsonb default null;

alter table public.owner_member_permissions
  add column if not exists images_allowed boolean not null default false,
  add column if not exists youtube_allowed boolean not null default false;
