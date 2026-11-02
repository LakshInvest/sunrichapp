-- =====================================================================
-- 20261102_speed.sql — faster PIN login and a single Home call
-- Additive and safe to re-run. Does NOT change check_pin itself:
-- check_pin_login() wraps it, so demo rules, trusted device, lockout and
-- wrong_pin counts behave exactly as now.
-- =====================================================================

-- 1) check_pin_login: check_pin + the sign-in email in ONE call.
--    The server then only needs generateLink (2 calls -> was 3).
create or replace function public.check_pin_login(
  p_mobile text, p_device_id text, p_pin text, p_user_type text default 'customer'
)
returns table(out_user_id uuid, out_result text, out_email text)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  r record;
begin
  select * into r from public.check_pin(p_mobile, p_device_id, p_pin, p_user_type) limit 1;
  return query
    select r.out_user_id, r.out_result,
           case when r.out_user_id is not null
                then (select u.email::text from auth.users u where u.id = r.out_user_id)
           end;
end;
$function$;

-- Same exposure as check_pin: server (service role) only.
revoke all on function public.check_pin_login(text, text, text, text) from public, anon, authenticated;
grant execute on function public.check_pin_login(text, text, text, text) to service_role;


-- 2) get_home: everything Home needs in one round trip.
--    SECURITY INVOKER: direct table reads go through the caller's RLS;
--    prices come from my_catalogue() (this customer's plan only, and it
--    rejects invalid sessions).
create or replace function public.get_home()
returns jsonb
language plpgsql
stable
security invoker
set search_path to 'public'
as $function$
declare
  v_cid     uuid := public.my_customer_id();
  v_company uuid := public.my_company_id();
  v_khata   jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  -- Staff who are also customers see every row through RLS, so every
  -- customer-owned read below is filtered explicitly by the caller's own
  -- customer. No customer yet (registration not finished) -> empty values.
  if v_cid is not null then
    begin
      v_khata := public.my_khata_summary();
    exception when others then
      v_khata := null;
    end;
  end if;

  return jsonb_build_object(
    -- app_hero has no is_active column: one row per company; newest edit wins.
    'hero', (
      select to_jsonb(h) from public.app_hero h
      where h.company_id = v_company
      order by h.updated_at desc nulls last
      limit 1),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object('key', s.key, 'sort_order', s.sort_order) order by s.sort_order)
      from public.app_home_sections s where s.is_active), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'code', c.code, 'name', c.name, 'name_hi', c.name_hi, 'name_mr', c.name_mr,
        'icon_key', c.icon_key, 'image_url', c.image_url, 'sort_order', c.sort_order) order by c.sort_order)
      from public.product_categories c where c.is_active), '[]'::jsonb),
    'banners', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'image_url', b.image_url,
        'title', b.title, 'title_hi', b.title_hi, 'title_mr', b.title_mr,
        'subtitle', b.subtitle, 'subtitle_hi', b.subtitle_hi, 'subtitle_mr', b.subtitle_mr,
        'tag', b.tag, 'tag_hi', b.tag_hi, 'tag_mr', b.tag_mr,
        'link_type', b.link_type, 'link_value', b.link_value,
        'customer_type_ids', b.customer_type_ids,
        'start_at', b.start_at, 'end_at', b.end_at, 'sort_order', b.sort_order) order by b.sort_order)
      from public.app_banners b where b.is_active), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(to_jsonb(p)) from public.my_catalogue() p), '[]'::jsonb),
    'khata', v_khata,
    'default_address', case when v_cid is null then null else (
      select to_jsonb(a) from public.customer_addresses a
      where a.customer_id = v_cid and a.is_active
      order by a.is_default desc, a.created_at asc
      limit 1) end,
    -- 'open' = Sunrich has replied and the chat waits for the CUSTOMER
    -- (customer_raise_query inserts 'answered' = waiting for Sunrich).
    'awaiting_reply', case when v_cid is null then 0 else (
      select count(*) from public.customer_queries q
      where q.customer_id = v_cid and q.status = 'open') end,
    'company_id', v_company,
    'session_id', public.current_session_id()
  );
end;
$function$;

revoke all on function public.get_home() from public, anon;
grant execute on function public.get_home() to authenticated, service_role;


-- =====================================================================
-- ROLLBACK (run only to undo). check_pin was never changed by this file;
-- its current definition is kept here for reference / restore.
-- =====================================================================
-- drop function if exists public.check_pin_login(text, text, text, text);
-- drop function if exists public.get_home();
--
-- CREATE OR REPLACE FUNCTION public.check_pin(p_mobile text, p_device_id text, p_pin text, p_user_type text DEFAULT 'customer'::text)
--  RETURNS TABLE(out_user_id uuid, out_result text)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'extensions'
-- AS $function$
-- declare
--   v_user uuid;
--   v_skip boolean;
--   v_dev  public.user_devices;
--   v_pin  public.user_pins;
-- begin
--   select p.id, (p.login_without_otp or p.is_demo) into v_user, v_skip from public.user_profiles p
--    where p.mobile = p_mobile and p.user_type::text = p_user_type and p.is_active;
--   if v_user is null then
--     return query select null::uuid, 'not_registered'; return;
--   end if;
--
--   select * into v_pin from public.user_pins up where up.user_id = v_user;
--   if v_pin.user_id is null then
--     return query select null::uuid, 'pin_not_set'; return;
--   end if;
--
--   if v_skip then
--     if v_pin.pin_hash = crypt(p_pin, v_pin.pin_hash) then
--       update public.user_pins up set last_used_at = now() where up.user_id = v_user;
--       return query select v_user, 'ok';
--     else
--       return query select null::uuid, 'wrong_pin:5';
--     end if;
--     return;
--   end if;
--
--   select * into v_dev from public.user_devices d
--    where d.user_id = v_user and d.device_id = p_device_id and d.revoked_at is null;
--   if v_dev.id is null then
--     return query select null::uuid, 'device_not_trusted'; return;
--   end if;
--   if v_pin.failed_attempts >= 5 then
--     return query select null::uuid, 'locked_use_otp'; return;
--   end if;
--
--   if v_pin.pin_hash = crypt(p_pin, v_pin.pin_hash) then
--     update public.user_pins up set failed_attempts = 0, last_used_at = now() where up.user_id = v_user;
--     update public.user_devices d set last_used_at = now() where d.id = v_dev.id;
--     return query select v_user, 'ok';
--   else
--     update public.user_pins up set failed_attempts = up.failed_attempts + 1 where up.user_id = v_user;
--     if v_pin.failed_attempts + 1 >= 5 then
--       return query select null::uuid, 'locked_use_otp';
--     else
--       return query select null::uuid, 'wrong_pin:' || (4 - v_pin.failed_attempts)::text;
--     end if;
--   end if;
-- end;
-- $function$;
