-- Sunrich App redesign (Prompt-35). Additive and safe to re-run.
-- 1) Per-banner display time (seconds) for the Home carousel. CC hint: image 1080×720.
alter table public.app_banners add column if not exists display_seconds smallint not null default 5;
do $$ begin
  alter table public.app_banners add constraint app_banners_display_seconds_chk check (display_seconds between 2 and 30);
exception when duplicate_object then null; end $$;
comment on column public.app_banners.image_url is 'Banner image, 1080×720 px (3:2).';

-- 2) Plant address + pickup timings for "I'll pick up" (shown in checkout step 2).
alter table public.app_settings add column if not exists plant_address text;
alter table public.app_settings add column if not exists pickup_hours text;   -- e.g. "Mon–Sat, 9 AM – 6 PM"

-- 3) get_home(): same as the live version, plus display_seconds on each banner.
CREATE OR REPLACE FUNCTION public.get_home()
 RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
declare
  v_cid     uuid := public.my_customer_id();
  v_company uuid := public.my_company_id();
  v_khata   jsonb;
begin
  if auth.uid() is null then raise exception 'Not allowed'; end if;
  if v_cid is not null then
    begin v_khata := public.my_khata_summary(); exception when others then v_khata := null; end;
  end if;
  return jsonb_build_object(
    'hero', (select to_jsonb(h) from public.app_hero h where h.company_id = v_company
             order by h.updated_at desc nulls last limit 1),
    'sections', coalesce((select jsonb_agg(jsonb_build_object('key', s.key, 'sort_order', s.sort_order) order by s.sort_order)
      from public.app_home_sections s where s.is_active), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'code', c.code, 'name', c.name, 'name_hi', c.name_hi, 'name_mr', c.name_mr,
        'icon_key', c.icon_key, 'image_url', c.image_url, 'sort_order', c.sort_order) order by c.sort_order)
      from public.product_categories c where c.is_active), '[]'::jsonb),
    'banners', coalesce((select jsonb_agg(jsonb_build_object(
        'id', b.id, 'image_url', b.image_url,
        'title', b.title, 'title_hi', b.title_hi, 'title_mr', b.title_mr,
        'subtitle', b.subtitle, 'subtitle_hi', b.subtitle_hi, 'subtitle_mr', b.subtitle_mr,
        'tag', b.tag, 'tag_hi', b.tag_hi, 'tag_mr', b.tag_mr,
        'link_type', b.link_type, 'link_value', b.link_value,
        'customer_type_ids', b.customer_type_ids,
        'start_at', b.start_at, 'end_at', b.end_at, 'sort_order', b.sort_order,
        'display_seconds', b.display_seconds) order by b.sort_order)
      from public.app_banners b where b.is_active
        and (b.start_at is null or b.start_at <= now())
        and (b.end_at is null or b.end_at >= now())), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(to_jsonb(p)) from public.my_catalogue() p), '[]'::jsonb),
    'khata', v_khata,
    'default_address', case when v_cid is null then null else (
      select to_jsonb(a) from public.customer_addresses a
      where a.customer_id = v_cid and a.is_active order by a.is_default desc, a.created_at asc limit 1) end,
    'awaiting_reply', case when v_cid is null then 0 else (
      select count(*) from public.customer_queries q where q.customer_id = v_cid and q.status = 'open') end,
    'company_id', v_company,
    'session_id', public.current_session_id()
  );
end;
$function$;

-- ROLLBACK (run only to undo):
-- 1. Re-run the get_home() from database/20261102_speed.sql (the version without display_seconds).
-- 2. alter table public.app_banners drop constraint if exists app_banners_display_seconds_chk;
--    alter table public.app_banners drop column if exists display_seconds;
-- 3. alter table public.app_settings drop column if exists plant_address;
--    alter table public.app_settings drop column if exists pickup_hours;
