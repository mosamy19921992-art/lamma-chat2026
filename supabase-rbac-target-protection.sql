-- ============================================================================
-- supabase-rbac-target-protection.sql
-- النسخة النهائية والموثوقة لدالة الإشراف.
--
-- يعالج:
--   #3  حماية رتبة الهدف (Target-rank protection):
--       لا يستطيع host عمل mute/kick/... لـ owner أو admin،
--       ولا يستطيع mod حظر رتبة أعلى منه. الاستثناء الوحيد: المالك/الأدمن العالمي.
--   #5  توحيد كل الإجراءات في مكان واحد:
--       mute, unmute, room_ban, unroom_ban, megaban, unmegaban,
--       kick, unkick, shadow, unshadow.
--
-- شغّل هذا الملف بعد كل ملفات الإشراف (p1, p2, hardening) — لأنه CREATE OR REPLACE
-- وبالتالي يصبح هو التعريف الأخير المعتمد.
--
-- يعتمد على دوال موجودة مسبقاً:
--   public.caller_effective_rank(text), public.role_rank(text),
--   public.is_admin(), public.resolve_bound_nickname(text)
-- ============================================================================

-- رتبة الهدف الفعّالة (أعلى من: الرتبة العالمية + رتبة الغرفة + المنح المؤقتة).
create or replace function public.target_effective_rank(
  p_target_user_id uuid,
  p_room_id text default null
)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    public.role_rank(coalesce(
      (select role from public.user_roles where user_id = p_target_user_id),
      'user'
    )),
    public.role_rank(coalesce(
      (select r.role from public.room_member_roles r
        where r.user_id = p_target_user_id and r.room_id = coalesce(p_room_id, '')),
      'user'
    )),
    public.role_rank(coalesce(
      (select t.role from public.room_temp_grants t
        where t.user_id = p_target_user_id and t.room_id = coalesce(p_room_id, '')
          and (t.expires_at is null or t.expires_at > timezone('utc'::text, now()))
        limit 1),
      'user'
    ))
  );
$$;

revoke all on function public.target_effective_rank(uuid, text) from public;
grant execute on function public.target_effective_rank(uuid, text) to authenticated;

create or replace function public.apply_moderation_action(
  p_action text,
  p_target_user_id uuid,
  p_target_nickname text,
  p_room_id text default null,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller uuid := auth.uid();
  v_global text;
  v_rank int;
  v_target_rank int;
  v_is_global_admin boolean;
  v_row public.banned_users%rowtype;
begin
  if v_caller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_target_nickname is null or length(trim(p_target_nickname)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'target_required');
  end if;

  select role into v_global from public.user_roles where user_id = v_caller;
  v_rank := public.caller_effective_rank(p_room_id);
  v_is_global_admin :=
    coalesce(v_global, '') in ('owner', 'malek', 'المالك', 'admin', 'أدمن');

  -- ── فحص رتبة المنفّذ (caller) ────────────────────────────────────────────
  if p_action in ('mute', 'unmute', 'kick', 'unkick', 'shadow', 'unshadow')
     and v_rank < public.role_rank('host') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  if p_action in ('room_ban', 'unroom_ban') and v_rank < public.role_rank('mod') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  if p_action in ('megaban', 'unmegaban', 'ban', 'unban') and not v_is_global_admin then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  -- ── #3 حماية رتبة الهدف (للإجراءات العقابية فقط) ──────────────────────────
  -- لا يمكن لأي شخص (غير المالك/الأدمن العالمي) أن يعاقب من هو في رتبته أو أعلى.
  if p_action in ('mute', 'kick', 'shadow', 'room_ban', 'megaban', 'ban')
     and p_target_user_id is not null
     and not v_is_global_admin then
    v_target_rank := public.target_effective_rank(p_target_user_id, p_room_id);
    if v_target_rank >= v_rank then
      return jsonb_build_object('ok', false, 'error', 'target_outranks_you');
    end if;
  end if;

  -- منع معاقبة النفس بالخطأ
  if p_action in ('mute', 'kick', 'shadow', 'room_ban', 'megaban', 'ban')
     and p_target_user_id = v_caller then
    return jsonb_build_object('ok', false, 'error', 'cannot_target_self');
  end if;

  -- ── تنفيذ الإجراء ─────────────────────────────────────────────────────────
  if p_action = 'mute' then
    insert into public.banned_users (uid, author, banner, reason, ban_type, target_user_id, room_id)
    values (
      coalesce(p_target_user_id::text, lower(trim(p_target_nickname))),
      trim(p_target_nickname),
      public.resolve_bound_nickname(v_caller::text),
      coalesce(nullif(trim(p_reason), ''), 'mute'),
      'mute', p_target_user_id, p_room_id
    )
    returning * into v_row;
    return jsonb_build_object('ok', true, 'ban_id', v_row.id, 'ban_type', v_row.ban_type);

  elsif p_action = 'unmute' then
    delete from public.banned_users
    where ban_type = 'mute'
      and (
        (p_target_user_id is not null and target_user_id = p_target_user_id)
        or lower(trim(author)) = lower(trim(p_target_nickname))
      )
      and (p_room_id is null or room_id is null or room_id = p_room_id);
    return jsonb_build_object('ok', true, 'action', 'unmute');

  elsif p_action = 'shadow' then
    insert into public.banned_users (uid, author, banner, reason, ban_type, target_user_id, room_id)
    values (
      coalesce(p_target_user_id::text, lower(trim(p_target_nickname))),
      trim(p_target_nickname),
      public.resolve_bound_nickname(v_caller::text),
      coalesce(nullif(trim(p_reason), ''), 'shadow'),
      'shadow', p_target_user_id, p_room_id
    )
    returning * into v_row;
    return jsonb_build_object('ok', true, 'ban_id', v_row.id, 'ban_type', v_row.ban_type);

  elsif p_action = 'unshadow' then
    delete from public.banned_users
    where ban_type = 'shadow'
      and (
        (p_target_user_id is not null and target_user_id = p_target_user_id)
        or lower(trim(author)) = lower(trim(p_target_nickname))
      );
    return jsonb_build_object('ok', true, 'action', 'unshadow');

  elsif p_action = 'kick' then
    if p_room_id is null or length(trim(p_room_id)) = 0 then
      return jsonb_build_object('ok', false, 'error', 'room_required');
    end if;
    insert into public.banned_users (
      uid, author, banner, reason, ban_type, target_user_id, room_id, expires_at
    )
    values (
      coalesce(p_target_user_id::text, lower(trim(p_target_nickname))),
      trim(p_target_nickname),
      public.resolve_bound_nickname(v_caller::text),
      coalesce(nullif(trim(p_reason), ''), 'kick'),
      'kick', p_target_user_id, p_room_id,
      timezone('utc'::text, now()) + interval '30 minutes'
    )
    returning * into v_row;
    return jsonb_build_object('ok', true, 'ban_id', v_row.id, 'ban_type', v_row.ban_type);

  elsif p_action = 'unkick' then
    delete from public.banned_users
    where ban_type = 'kick'
      and room_id = p_room_id
      and (
        (p_target_user_id is not null and target_user_id = p_target_user_id)
        or lower(trim(author)) = lower(trim(p_target_nickname))
      );
    return jsonb_build_object('ok', true, 'action', 'unkick');

  elsif p_action = 'room_ban' then
    if p_room_id is null or length(trim(p_room_id)) = 0 then
      return jsonb_build_object('ok', false, 'error', 'room_required');
    end if;
    insert into public.banned_users (uid, author, banner, reason, ban_type, target_user_id, room_id)
    values (
      coalesce(p_target_user_id::text, lower(trim(p_target_nickname))),
      trim(p_target_nickname),
      public.resolve_bound_nickname(v_caller::text),
      coalesce(nullif(trim(p_reason), ''), 'room_ban'),
      'room', p_target_user_id, p_room_id
    )
    returning * into v_row;
    return jsonb_build_object('ok', true, 'ban_id', v_row.id, 'ban_type', v_row.ban_type);

  elsif p_action = 'unroom_ban' then
    delete from public.banned_users
    where ban_type = 'room'
      and room_id = p_room_id
      and (
        (p_target_user_id is not null and target_user_id = p_target_user_id)
        or lower(trim(author)) = lower(trim(p_target_nickname))
      );
    return jsonb_build_object('ok', true, 'action', 'unroom_ban');

  elsif p_action = 'megaban' then
    insert into public.banned_users (uid, author, banner, reason, ban_type, target_user_id)
    values (
      coalesce(p_target_user_id::text, lower(trim(p_target_nickname))),
      trim(p_target_nickname),
      public.resolve_bound_nickname(v_caller::text),
      coalesce(nullif(trim(p_reason), ''), 'megaban'),
      'megaban', p_target_user_id
    )
    returning * into v_row;
    return jsonb_build_object('ok', true, 'ban_id', v_row.id, 'ban_type', v_row.ban_type);

  elsif p_action = 'unmegaban' then
    delete from public.banned_users
    where ban_type = 'megaban'
      and (
        (p_target_user_id is not null and target_user_id = p_target_user_id)
        or lower(trim(author)) = lower(trim(p_target_nickname))
      );
    return jsonb_build_object('ok', true, 'action', 'unmegaban');
  end if;

  return jsonb_build_object('ok', false, 'error', 'invalid_action');
end;
$$;

revoke all on function public.apply_moderation_action(text, uuid, text, text, text) from public;
grant execute on function public.apply_moderation_action(text, uuid, text, text, text) to authenticated;
