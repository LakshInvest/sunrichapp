-- Sunrich: product details, app images, plant-per-area, address zoning, auto route planning (Prompt-48).
-- NOT RUN BY THE APP. Review, then run once in the Supabase SQL editor. Additive and safe to re-run.
-- Out of scope (on hold): subscriptions, jar deposit, jar ledger, QR.
-- PostGIS is NOT installed on this project, so area lookup uses plpgsql point-in-polygon on geo_areas.boundary (GeoJSON).

-- ───────────────────────── 1) Product details ─────────────────────────
alter table public.products add column if not exists highlights jsonb not null default '[]'::jsonb;  -- [{icon_key,text,text_hi,text_mr}]
alter table public.products add column if not exists faqs jsonb not null default '[]'::jsonb;        -- [{q,q_hi,q_mr,a,a_hi,a_mr}]
alter table public.products add column if not exists delivery_info text;
alter table public.products add column if not exists delivery_info_hi text;
alter table public.products add column if not exists delivery_info_mr text;
do $$ begin
  alter table public.products add constraint products_highlights_array_chk check (jsonb_typeof(highlights) = 'array');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_faqs_array_chk check (jsonb_typeof(faqs) = 'array');
exception when duplicate_object then null; end $$;

alter table public.product_images add column if not exists is_primary boolean not null default false;
alter table public.product_images add column if not exists alt text;
create unique index if not exists product_images_one_primary on public.product_images (product_id) where is_primary;

-- Customer product page: one product from the customer's own catalogue (same prices/rules as my_catalogue)
-- plus highlights, FAQs, delivery info and ordered images (primary first).
create or replace function public.my_product(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v jsonb;
begin
  select to_jsonb(c) into v from public.my_catalogue() c where c.id = p_id;   -- enforces session + catalogue visibility
  if v is null then return null; end if;
  return v || (
    select jsonb_build_object(
      'highlights', p.highlights, 'faqs', p.faqs,
      'delivery_info', p.delivery_info, 'delivery_info_hi', p.delivery_info_hi, 'delivery_info_mr', p.delivery_info_mr,
      'image_list', coalesce((select jsonb_agg(jsonb_build_object('id', pi.id, 'url', pi.url, 'alt', pi.alt, 'is_primary', pi.is_primary)
                                order by pi.is_primary desc, pi.sort_order, pi.created_at)
                              from public.product_images pi where pi.product_id = p.id), '[]'::jsonb))
    from public.products p where p.id = p_id);
end $$;

-- ───────────────────────── 2) App images ─────────────────────────
alter table public.app_settings add column if not exists launch_image_url text;
alter table public.app_settings add column if not exists login_image_url text;

-- ───────────────────────── 3) Plants per area + area on addresses ─────────────────────────
alter table public.geo_areas add column if not exists unit_id uuid;
alter table public.geo_areas add column if not exists default_vehicle_id uuid;
do $$ begin
  alter table public.geo_areas add constraint geo_areas_unit_id_fkey foreign key (unit_id) references public.units(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.geo_areas add constraint geo_areas_default_vehicle_id_fkey foreign key (default_vehicle_id) references public.vehicles(id) on delete set null;
exception when duplicate_object then null; end $$;

alter table public.units add column if not exists pickup_hours text;
alter table public.units add column if not exists pickup_hours_hi text;
alter table public.units add column if not exists pickup_hours_mr text;

alter table public.customer_addresses add column if not exists area_id uuid;
do $$ begin
  alter table public.customer_addresses add constraint customer_addresses_area_id_fkey foreign key (area_id) references public.geo_areas(id) on delete set null;
exception when duplicate_object then null; end $$;
create index if not exists customer_addresses_area_id_idx on public.customer_addresses (area_id);

-- Rings of a boundary. Accepts GeoJSON Feature / FeatureCollection / Polygon / MultiPolygon,
-- a bare ring [[lng,lat],...] or [{lat,lng},...], or a list of such rings.
create or replace function public._geo_rings(b jsonb)
returns setof jsonb language plpgsql immutable set search_path to 'public'
as $$
declare e jsonb;
begin
  if b is null or jsonb_typeof(b) = 'null' then return; end if;
  if jsonb_typeof(b) = 'object' then
    case b->>'type'
      when 'Feature' then return query select * from public._geo_rings(b->'geometry');
      when 'FeatureCollection' then
        for e in select jsonb_array_elements(coalesce(b->'features', '[]')) loop
          return query select * from public._geo_rings(e);
        end loop;
      when 'Polygon' then return query select jsonb_array_elements(b->'coordinates');
      when 'MultiPolygon' then
        return query select r from jsonb_array_elements(b->'coordinates') poly, jsonb_array_elements(poly) r;
      else
        if b ? 'coordinates' then return query select * from public._geo_rings(b->'coordinates'); end if;
    end case;
    return;
  end if;
  if jsonb_typeof(b) <> 'array' or jsonb_array_length(b) = 0 then return; end if;
  e := b->0;
  if jsonb_typeof(e) = 'object' or (jsonb_typeof(e) = 'array' and jsonb_typeof(e->0) = 'number') then
    return next b;                                   -- a single ring
  else
    for e in select jsonb_array_elements(b) loop     -- list of rings / polygons
      return query select * from public._geo_rings(e);
    end loop;
  end if;
end $$;

-- Even-odd point-in-polygon over all rings (holes handled naturally).
create or replace function public._point_in_boundary(p_lat numeric, p_lng numeric, p_boundary jsonb)
returns boolean language plpgsql immutable set search_path to 'public'
as $$
declare ring jsonb; n int; i int; j int; xi float8; yi float8; xj float8; yj float8; pi jsonb; pj jsonb;
        inside boolean := false; x float8 := p_lng; y float8 := p_lat;
begin
  if p_lat is null or p_lng is null or p_boundary is null then return false; end if;
  for ring in select * from public._geo_rings(p_boundary) loop
    n := jsonb_array_length(ring);
    if n < 3 then continue; end if;
    j := n - 1;
    for i in 0 .. n - 1 loop
      pi := ring->i; pj := ring->j;
      if jsonb_typeof(pi) = 'array' then xi := (pi->>0)::float8; yi := (pi->>1)::float8;
      else xi := coalesce(pi->>'lng', pi->>'lon')::float8; yi := (pi->>'lat')::float8; end if;
      if jsonb_typeof(pj) = 'array' then xj := (pj->>0)::float8; yj := (pj->>1)::float8;
      else xj := coalesce(pj->>'lng', pj->>'lon')::float8; yj := (pj->>'lat')::float8; end if;
      if ((yi > y) <> (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi) then inside := not inside; end if;
      j := i;
    end loop;
  end loop;
  return inside;
exception when others then return false;   -- malformed boundary never blocks an address save
end $$;

create or replace function public._area_for_point(p_company uuid, p_lat numeric, p_lng numeric)
returns uuid language sql stable security definer set search_path to 'public'
as $$
  select a.id from public.geo_areas a
   where a.is_active and a.boundary is not null
     and (p_company is null or a.company_id = p_company)
     and public._point_in_boundary(p_lat, p_lng, a.boundary)
   order by a.code nulls last, a.created_at
   limit 1;
$$;

create or replace function public._address_set_area()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' or new.latitude is distinct from old.latitude or new.longitude is distinct from old.longitude then
    new.area_id := case when new.latitude is null or new.longitude is null then null
      else public._area_for_point((select c.company_id from public.customers c where c.id = new.customer_id), new.latitude, new.longitude) end;
  end if;
  return new;
end $$;
drop trigger if exists customer_addresses_set_area on public.customer_addresses;
create trigger customer_addresses_set_area before insert or update of latitude, longitude on public.customer_addresses
  for each row execute function public._address_set_area();

-- One-time backfill (re-run only fills rows still without an area).
update public.customer_addresses ca
   set area_id = public._area_for_point(c.company_id, ca.latitude, ca.longitude)
  from public.customers c
 where c.id = ca.customer_id and ca.area_id is null and ca.latitude is not null and ca.longitude is not null;

-- Staff: active addresses with no area.
create or replace function public.cc_unzoned_addresses()
returns table(address_id uuid, customer_id uuid, customer_name text, label text, address text, pincode text,
              latitude numeric, longitude numeric, updated_at timestamptz)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not (public.has_perm('customers', 'view') or public.has_perm('dispatch', 'view')) then raise exception 'Not allowed'; end if;
  return query
  select a.id, a.customer_id, coalesce(c.business_name, c.name)::text, a.label,
         concat_ws(', ', a.address_line1, a.address_line2, a.landmark, a.city), a.pincode, a.latitude, a.longitude, a.updated_at
    from public.customer_addresses a
    join public.customers c on c.id = a.customer_id
   where a.is_active and a.area_id is null and c.company_id = public.my_company_id()
   order by a.updated_at desc;
end $$;

-- Pickup point for a customer = plant of the default address's area; fallback app_settings.
create or replace function public._pickup_for_customer(p_cid uuid, p_company uuid)
returns jsonb language sql stable security definer set search_path to 'public'
as $$
  with a as (
    select ca.area_id from public.customer_addresses ca
     where ca.customer_id = p_cid and ca.is_active order by ca.is_default desc, ca.created_at asc limit 1),
  u as (select un.* from a join public.geo_areas ga on ga.id = a.area_id join public.units un on un.id = ga.unit_id and un.is_active),
  s as (select * from public.app_settings where company_id = p_company limit 1)
  select jsonb_build_object(
    'area_id', (select area_id from a),
    'unit_id', (select id from u),
    'unit_name', (select coalesce(display_name, name) from u),
    'latitude', (select latitude from u), 'longitude', (select longitude from u),
    'address', coalesce((select nullif(concat_ws(', ', address_line1, address_line2, city, pincode), '') from u), (select plant_address from s)),
    'address_hi', coalesce((select nullif(concat_ws(', ', address_line1, address_line2, city, pincode), '') from u), (select plant_address_hi from s)),
    'address_mr', coalesce((select nullif(concat_ws(', ', address_line1, address_line2, city, pincode), '') from u), (select plant_address_mr from s)),
    'hours', coalesce((select pickup_hours from u), (select pickup_hours from s)),
    'hours_hi', coalesce((select pickup_hours_hi from u), (select pickup_hours_hi from s)),
    'hours_mr', coalesce((select pickup_hours_mr from u), (select pickup_hours_mr from s)));
$$;

-- get_home(): identical to the live version + 'default_area_id' and 'pickup'.
CREATE OR REPLACE FUNCTION public.get_home()
 RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
declare
  v_cid     uuid := public.my_customer_id();
  v_company uuid := public.my_company_id();
  v_khata   jsonb;
  v_pickup  jsonb;
begin
  if auth.uid() is null then raise exception 'Not allowed'; end if;
  if v_cid is not null then
    begin v_khata := public.my_khata_summary(); exception when others then v_khata := null; end;
  end if;
  v_pickup := public._pickup_for_customer(v_cid, v_company);
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
    'default_area_id', v_pickup->'area_id',
    'pickup', v_pickup,
    'awaiting_reply', case when v_cid is null then 0 else (
      select count(*) from public.customer_queries q where q.customer_id = v_cid and q.status = 'open') end,
    'company_id', v_company,
    'session_id', public.current_session_id()
  );
end;
$function$;

-- ───────────────────────── 4) Route planning ─────────────────────────
alter table public.vehicles add column if not exists capacity_jars integer;
alter table public.vehicles add column if not exists capacity_boxes integer;

alter table public.app_settings add column if not exists google_routes_enabled boolean not null default false;
alter table public.app_settings add column if not exists google_routes_min_stops integer not null default 15;
alter table public.app_settings add column if not exists plan_time time not null default '23:00';
alter table public.app_settings add column if not exists auto_plan_last_date date;   -- internal: last date auto-planned by the job

create or replace function public._hav_km(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
returns float8 language sql immutable set search_path to 'public'
as $$
  select case when lat1 is null or lat2 is null or lng1 is null or lng2 is null then 0 else
    2 * 6371 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))) end;
$$;

-- Free stop ordering for one trip: nearest-neighbour from the plant, then 2-opt (closed tour back to plant).
-- Non-pending stops keep their place at the front; stops without coordinates go last.
-- est_km = haversine × 1.3 road factor; est_minutes = km at 25 km/h + 5 min per stop.
create or replace function public._optimise_trip(p_trip_id uuid, p_method text default 'auto')
returns void language plpgsql security definer set search_path to 'public'
as $$
declare
  ids uuid[] := '{}'; la float8[] := '{}'; ln float8[] := '{}'; nocoord uuid[]; done uuid[];
  n int; r int[] := '{}'; vis boolean[]; cur int; best int; bd float8; d float8;
  i int; k int; a int; b int; c int; e int; improved boolean; km float8 := 0; seq int := 0; s record; guard int := 0;
begin
  select coalesce(array_agg(id order by seq), '{}') into done from public.trip_stops where trip_id = p_trip_id and status <> 'pending';
  select array_agg(st.id order by st.seq) into nocoord
    from public.trip_stops st left join public.orders o on o.id = st.order_id
   where st.trip_id = p_trip_id and st.status = 'pending'
     and coalesce(st.latitude, o.delivery_lat, o.delivery_latitude) is null;
  -- index 1 = plant
  select array[coalesce(u.latitude, 0)::float8], array[coalesce(u.longitude, 0)::float8], u.latitude is null
    into la, ln, improved
    from public.trips t left join public.units u on u.id = t.unit_id where t.id = p_trip_id;
  for s in select st.id, coalesce(st.latitude, o.delivery_lat, o.delivery_latitude)::float8 lat,
                  coalesce(st.longitude, o.delivery_lng, o.delivery_longitude)::float8 lng
             from public.trip_stops st left join public.orders o on o.id = st.order_id
            where st.trip_id = p_trip_id and st.status = 'pending'
              and coalesce(st.latitude, o.delivery_lat, o.delivery_latitude) is not null
            order by st.seq loop
    ids := ids || s.id; la := la || s.lat; ln := ln || s.lng;
  end loop;
  n := coalesce(array_length(ids, 1), 0);
  if n > 0 and coalesce(improved, true) then la[1] := la[2]; ln[1] := ln[2]; end if;  -- no plant pin: start at first stop
  if n > 0 then
    vis := array_fill(false, array[n + 1]); cur := 1;
    for i in 1 .. n loop
      best := null; bd := null;
      for k in 2 .. n + 1 loop
        if not vis[k] then
          d := public._hav_km(la[cur], ln[cur], la[k], ln[k]);
          if bd is null or d < bd then bd := d; best := k; end if;
        end if;
      end loop;
      vis[best] := true; r := r || best; cur := best;
    end loop;
    improved := n > 2;
    while improved and guard < 200 loop
      improved := false; guard := guard + 1;
      for i in 1 .. n - 1 loop
        for k in i + 1 .. n loop
          a := case when i = 1 then 1 else r[i - 1] end; b := r[i]; c := r[k]; e := case when k = n then 1 else r[k + 1] end;
          if public._hav_km(la[a], ln[a], la[c], ln[c]) + public._hav_km(la[b], ln[b], la[e], ln[e])
             < public._hav_km(la[a], ln[a], la[b], ln[b]) + public._hav_km(la[c], ln[c], la[e], ln[e]) - 1e-9 then
            r := r[1:i - 1] || (select array_agg(r[g] order by g desc) from generate_series(i, k) g) || r[k + 1:n];
            improved := true;
          end if;
        end loop;
      end loop;
    end loop;
    cur := 1;
    for i in 1 .. n loop km := km + public._hav_km(la[cur], ln[cur], la[r[i]], ln[r[i]]); cur := r[i]; end loop;
    km := km + public._hav_km(la[cur], ln[cur], la[1], ln[1]);
  end if;
  foreach s.id in array coalesce(done, '{}') loop seq := seq + 1; update public.trip_stops set seq = seq where id = s.id; end loop;
  for i in 1 .. n loop seq := seq + 1; update public.trip_stops set seq = seq where id = ids[r[i] - 1]; end loop;
  foreach s.id in array coalesce(nocoord, '{}') loop seq := seq + 1; update public.trip_stops set seq = seq where id = s.id; end loop;
  update public.trips
     set est_km = round((km * 1.3)::numeric, 1),
         est_minutes = round(km * 1.3 / 25 * 60 + 5 * (n + coalesce(array_length(nocoord, 1), 0)))::int,
         route_method = coalesce(p_method, 'auto'), route_optimised_at = now()
   where id = p_trip_id;
end $$;

-- Candidate orders for auto planning with resolved plant/route/area/vehicle and load; reason when not plannable.
create or replace function public._plan_candidates(p_date date, p_company uuid)
returns table(order_id uuid, company_id uuid, unit_id uuid, route_id uuid, area_id uuid, vehicle_id uuid,
              route_sort int, units numeric, jars numeric, boxes numeric, reason text)
language sql stable security definer set search_path to 'public'
as $$
  with o as (
    select o.*, coalesce(o.area_id, ca.area_id) as res_area
      from public.orders o
      left join public.customer_addresses ca on ca.id = o.delivery_address_id
     where o.delivery_date = p_date and o.status = 'approved' and o.fulfiller_customer_id is null
       and coalesce(o.delivery_mode, 'sunrich') <> 'pickup'
       and (p_company is null or o.company_id = p_company)
       and not exists (select 1 from public.trip_stops s where s.order_id = o.id and s.status = 'pending'))
  select o.id, o.company_id, coalesce(ga.unit_id, gr.unit_id), gr.id, o.res_area,
         coalesce(ga.default_vehicle_id, gr.default_vehicle_id), coalesce(ra.sort_order, 0),
         coalesce(l.units, 0), coalesce(l.jars, 0), coalesce(l.boxes, 0),
         case when o.res_area is null then 'No area for the delivery address'
              when coalesce(ga.unit_id, gr.unit_id) is null then 'Area has no plant'
              when coalesce(ga.default_vehicle_id, gr.default_vehicle_id) is null
                   and not exists (select 1 from public.vehicles v where v.unit_id = coalesce(ga.unit_id, gr.unit_id) and v.is_active)
                then 'Plant has no active vehicle'
         end
    from o
    left join public.geo_areas ga on ga.id = o.res_area
    left join lateral (select x.route_id, x.sort_order from public.geo_route_areas x
                         join public.geo_routes rr on rr.id = x.route_id and rr.is_active
                        where x.area_id = o.res_area order by (x.route_id = o.route_id) desc, x.sort_order limit 1) ra on true
    left join public.geo_routes gr on gr.id = coalesce(ra.route_id, o.route_id)
    left join lateral (select sum(ol.qty) units,
                              sum(ol.qty) filter (where p.sell_unit = 'jar') jars,
                              sum(ol.qty) filter (where p.sell_unit in ('case', 'pack', 'crate')) boxes
                         from public.order_lines ol join public.products p on p.id = ol.product_id
                        where ol.order_id = o.id) l on true;
$$;

create or replace function public._auto_plan(p_date date, p_company uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  c record; v_trip uuid; v_veh public.vehicles; v_key text := ''; v_u numeric; v_j numeric; v_b numeric; v_seq int;
  touched uuid[] := '{}'; v_planned int := 0; v_t record;
begin
  for c in select * from public._plan_candidates(p_date, p_company) where reason is null
            order by company_id, unit_id, route_id nulls last, route_sort, area_id loop
    if v_key is distinct from concat(c.unit_id, '/', c.route_id) then v_key := concat(c.unit_id, '/', c.route_id); v_trip := null; end if;
    -- fits the current trip?
    if v_trip is not null then
      select v.* into v_veh from public.trips t join public.vehicles v on v.id = t.vehicle_id where t.id = v_trip;
      select coalesce(sum(cc.units),0), coalesce(sum(cc.jars),0), coalesce(sum(cc.boxes),0) into v_u, v_j, v_b
        from public.trip_stops s
        cross join lateral (select * from public._plan_candidates_load(s.order_id)) cc
       where s.trip_id = v_trip and s.status = 'pending';
      if (coalesce(v_veh.capacity_units,0) > 0 and v_u + c.units > v_veh.capacity_units)
         or (coalesce(v_veh.capacity_jars,0) > 0 and v_j + c.jars > v_veh.capacity_jars)
         or (coalesce(v_veh.capacity_boxes,0) > 0 and v_b + c.boxes > v_veh.capacity_boxes) then
        v_trip := null;
      end if;
    end if;
    if v_trip is null then
      -- 1) re-run: an existing planned auto trip on this route/date with room
      select t.id into v_trip from public.trips t join public.vehicles v on v.id = t.vehicle_id
        left join lateral (select coalesce(sum(l.units),0) u, coalesce(sum(l.jars),0) j, coalesce(sum(l.boxes),0) b
                             from public.trip_stops s cross join lateral public._plan_candidates_load(s.order_id) l
                            where s.trip_id = t.id and s.status = 'pending') ld on true
       where t.trip_date = p_date and t.status = 'planned' and t.route_method = 'auto' and t.unit_id = c.unit_id
         and t.route_id is not distinct from c.route_id and t.company_id = c.company_id
         and (coalesce(v.capacity_units,0) = 0 or ld.u + c.units <= v.capacity_units)
         and (coalesce(v.capacity_jars,0) = 0 or ld.j + c.jars <= v.capacity_jars)
         and (coalesce(v.capacity_boxes,0) = 0 or ld.b + c.boxes <= v.capacity_boxes)
       order by t.created_at limit 1;
    end if;
    if v_trip is null then
      -- 2) default vehicle if it has no trip that day, 3) next free vehicle of the plant, 4) default vehicle again (trip 2, 3 …)
      select v.* into v_veh from public.vehicles v
       where v.is_active and v.company_id = c.company_id
         and (v.id = c.vehicle_id or v.unit_id = c.unit_id)
       order by (exists (select 1 from public.trips t where t.vehicle_id = v.id and t.trip_date = p_date and t.status <> 'cancelled')),
                (v.id = c.vehicle_id) desc, v.capacity_units desc nulls last, v.reg_no
       limit 1;
      if v_veh.id is null then continue; end if;
      insert into public.trips (company_id, trip_no, unit_id, vehicle_id, route_id, trip_date, status, trip_type, route_method)
      values (c.company_id, 'TRP/' || to_char(p_date, 'YYMMDD') || '/' || lpad(nextval('public.trip_seq')::text, 4, '0'),
              c.unit_id, v_veh.id, c.route_id, p_date, 'planned', 'delivery', 'auto')
      returning id into v_trip;
    end if;
    select coalesce(max(seq), 0) + 1 into v_seq from public.trip_stops where trip_id = v_trip;
    insert into public.trip_stops (trip_id, order_id, seq) values (v_trip, c.order_id, v_seq);
    perform public._set_order_status(c.order_id, 'processing', 'Auto-planned on a trip');
    if not v_trip = any (touched) then touched := touched || v_trip; end if;
    v_planned := v_planned + 1;
  end loop;

  foreach v_trip in array touched loop
    delete from public.trip_loading where trip_id = v_trip;
    insert into public.trip_loading (trip_id, product_id, planned_qty)
    select v_trip, ol.product_id, sum(ol.qty) from public.trip_stops s join public.order_lines ol on ol.order_id = s.order_id
     where s.trip_id = v_trip and s.status = 'pending' group by ol.product_id;
    perform public._optimise_trip(v_trip, 'auto');
  end loop;

  return jsonb_build_object('date', p_date, 'planned_orders', v_planned, 'trips', to_jsonb(touched),
    'not_planned', (select count(*) from public._plan_candidates(p_date, p_company) where reason is not null));
end $$;

-- Load of one order (helper for _auto_plan capacity checks).
create or replace function public._plan_candidates_load(p_order_id uuid)
returns table(units numeric, jars numeric, boxes numeric)
language sql stable security definer set search_path to 'public'
as $$
  select coalesce(sum(ol.qty), 0),
         coalesce(sum(ol.qty) filter (where p.sell_unit = 'jar'), 0),
         coalesce(sum(ol.qty) filter (where p.sell_unit in ('case', 'pack', 'crate')), 0)
    from public.order_lines ol join public.products p on p.id = ol.product_id where ol.order_id = p_order_id;
$$;

-- Staff entry point (dispatch.create). Called with no user (cron/service role) it plans every company.
create or replace function public.auto_plan_trips(p_date date)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
begin
  if auth.uid() is not null then
    if not public.has_perm('dispatch', 'create') then raise exception 'Not allowed'; end if;
    return public._auto_plan(p_date, public.my_company_id());
  end if;
  return public._auto_plan(p_date, null);
end $$;

create or replace function public.cc_unplanned_orders(p_date date)
returns table(order_id uuid, order_no text, customer_name text, delivery_address text, area_id uuid, reason text)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.has_perm('dispatch', 'view') then raise exception 'Not allowed'; end if;
  return query
  select c.order_id, o.order_no, coalesce(o.business_name, o.customer_name), o.delivery_address_text, c.area_id, c.reason
    from public._plan_candidates(p_date, public.my_company_id()) c join public.orders o on o.id = c.order_id
   where c.reason is not null order by o.created_at;
end $$;

create or replace function public.reoptimise_trip(p_trip_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.has_perm('dispatch', 'edit') then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.trips where id = p_trip_id and company_id = public.my_company_id() and status in ('planned', 'loading', 'loaded')) then
    raise exception 'Trip not found or already started';
  end if;
  perform public._optimise_trip(p_trip_id, 'auto');
  return (select jsonb_build_object('est_km', est_km, 'est_minutes', est_minutes) from public.trips where id = p_trip_id);
end $$;

-- Stores the order computed by the Google Routes Edge Function (service role) or a dispatcher.
create or replace function public.save_trip_order(p_trip_id uuid, p_stop_ids uuid[], p_est_km numeric, p_est_minutes integer, p_method text default 'google')
returns void language plpgsql security definer set search_path to 'public'
as $$
declare v_bad int; v_id uuid; v_seq int := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if not public.has_perm('dispatch', 'edit') then raise exception 'Not allowed'; end if;
    if not exists (select 1 from public.trips where id = p_trip_id and company_id = public.my_company_id()) then raise exception 'Not allowed'; end if;
  end if;
  select count(*) into v_bad from unnest(p_stop_ids) x
   where not exists (select 1 from public.trip_stops s where s.id = x and s.trip_id = p_trip_id);
  if v_bad > 0 then raise exception '% stop(s) are not on this trip', v_bad; end if;
  foreach v_id in array p_stop_ids loop v_seq := v_seq + 1; update public.trip_stops set seq = v_seq where id = v_id; end loop;
  for v_id in select id from public.trip_stops where trip_id = p_trip_id and not (id = any (p_stop_ids)) order by seq loop
    v_seq := v_seq + 1; update public.trip_stops set seq = v_seq where id = v_id;
  end loop;
  update public.trips set est_km = p_est_km, est_minutes = p_est_minutes,
         route_method = coalesce(p_method, 'google'), route_optimised_at = now() where id = p_trip_id;
end $$;

-- Pending stops on today's (IST) trips after trip_overdue_time → one 'missed_stop' alert per stop.
create or replace function public.missed_stops_check()
returns integer language plpgsql security definer set search_path to 'public'
as $$
declare n int;
begin
  insert into public.trip_alerts (trip_id, stop_id, alert_type, note)
  select t.id, s.id, 'missed_stop', 'Stop still pending after ' || to_char(st.trip_overdue_time, 'HH24:MI')
    from public.trips t
    join public.app_settings st on st.company_id = t.company_id
    join public.trip_stops s on s.trip_id = t.id and s.status = 'pending'
   where t.trip_date = (now() at time zone 'Asia/Kolkata')::date
     and t.status not in ('settled', 'cancelled', 'returned')
     and (now() at time zone 'Asia/Kolkata')::time >= coalesce(st.trip_overdue_time, '21:00')
     and not exists (select 1 from public.trip_alerts a where a.stop_id = s.id and a.alert_type = 'missed_stop');
  get diagnostics n = row_count;
  return n;
end $$;

-- Jobs (cron only). Auto-plan runs every 15 min and fires once per company when IST time passes plan_time.
create or replace function public.job_auto_plan_trips()
returns integer language plpgsql security definer set search_path to 'public'
as $$
declare s record; n int := 0; v_target date := (now() at time zone 'Asia/Kolkata')::date + 1;
begin
  for s in select company_id from public.app_settings
            where (now() at time zone 'Asia/Kolkata')::time >= coalesce(plan_time, '23:00')
              and auto_plan_last_date is distinct from v_target loop
    perform public._auto_plan(v_target, s.company_id);
    update public.app_settings set auto_plan_last_date = v_target where company_id = s.company_id;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.job_missed_stops_check()
returns integer language plpgsql security definer set search_path to 'public'
as $$ begin return public.missed_stops_check(); end $$;

select cron.schedule('sunrich_auto_plan_trips', '*/15 * * * *', 'select public.job_auto_plan_trips();');
-- every 30 min, 09:00–23:30 IST (03:30–18:00 UTC)
select cron.schedule('sunrich_missed_stops_check', '*/30 3-18 * * *', 'select public.job_missed_stops_check();');

-- ───────────────────────── 5) Grants ─────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'public.my_product(uuid)', 'public._geo_rings(jsonb)', 'public._point_in_boundary(numeric,numeric,jsonb)',
    'public._area_for_point(uuid,numeric,numeric)', 'public._address_set_area()', 'public.cc_unzoned_addresses()',
    'public._pickup_for_customer(uuid,uuid)', 'public.get_home()', 'public._hav_km(float8,float8,float8,float8)',
    'public._optimise_trip(uuid,text)', 'public._plan_candidates(date,uuid)', 'public._plan_candidates_load(uuid)',
    'public._auto_plan(date,uuid)', 'public.auto_plan_trips(date)', 'public.cc_unplanned_orders(date)',
    'public.reoptimise_trip(uuid)', 'public.save_trip_order(uuid,uuid[],numeric,integer,text)',
    'public.missed_stops_check()', 'public.job_auto_plan_trips()', 'public.job_missed_stops_check()'] loop
    execute format('revoke all on function %s from public, anon', f);
  end loop;
end $$;
-- customer
grant execute on function public.my_product(uuid) to authenticated;
grant execute on function public.get_home() to authenticated;
-- staff (each checks has_perm inside)
grant execute on function public.cc_unzoned_addresses() to authenticated;
grant execute on function public.auto_plan_trips(date) to authenticated, service_role;
grant execute on function public.cc_unplanned_orders(date) to authenticated;
grant execute on function public.reoptimise_trip(uuid) to authenticated;
grant execute on function public.save_trip_order(uuid,uuid[],numeric,integer,text) to authenticated, service_role;
-- internal helpers / jobs: not callable by clients
revoke all on function public._geo_rings(jsonb), public._point_in_boundary(numeric,numeric,jsonb),
  public._area_for_point(uuid,numeric,numeric), public._pickup_for_customer(uuid,uuid), public._hav_km(float8,float8,float8,float8),
  public._optimise_trip(uuid,text), public._plan_candidates(date,uuid), public._plan_candidates_load(uuid), public._auto_plan(date,uuid),
  public.missed_stops_check(), public.job_auto_plan_trips(), public.job_missed_stops_check() from authenticated;

-- ───────────────────────── CHECK (every row should be true) ─────────────────────────
select o.name, o.ok from (values
  ('products.highlights',  exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='highlights')),
  ('products.faqs',        exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='faqs')),
  ('products.delivery_info_mr', exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='delivery_info_mr')),
  ('product_images.is_primary', exists (select 1 from information_schema.columns where table_schema='public' and table_name='product_images' and column_name='is_primary')),
  ('product_images.alt',   exists (select 1 from information_schema.columns where table_schema='public' and table_name='product_images' and column_name='alt')),
  ('app_settings.launch_image_url', exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_settings' and column_name='launch_image_url')),
  ('app_settings.login_image_url',  exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_settings' and column_name='login_image_url')),
  ('app_settings.google_routes_enabled', exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_settings' and column_name='google_routes_enabled')),
  ('app_settings.google_routes_min_stops', exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_settings' and column_name='google_routes_min_stops')),
  ('app_settings.plan_time', exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_settings' and column_name='plan_time')),
  ('geo_areas.unit_id',    exists (select 1 from information_schema.columns where table_schema='public' and table_name='geo_areas' and column_name='unit_id')),
  ('geo_areas.default_vehicle_id', exists (select 1 from information_schema.columns where table_schema='public' and table_name='geo_areas' and column_name='default_vehicle_id')),
  ('units.pickup_hours_mr', exists (select 1 from information_schema.columns where table_schema='public' and table_name='units' and column_name='pickup_hours_mr')),
  ('customer_addresses.area_id', exists (select 1 from information_schema.columns where table_schema='public' and table_name='customer_addresses' and column_name='area_id')),
  ('vehicles.capacity_jars',  exists (select 1 from information_schema.columns where table_schema='public' and table_name='vehicles' and column_name='capacity_jars')),
  ('vehicles.capacity_boxes', exists (select 1 from information_schema.columns where table_schema='public' and table_name='vehicles' and column_name='capacity_boxes')),
  ('trigger customer_addresses_set_area', exists (select 1 from pg_trigger where tgname='customer_addresses_set_area')),
  ('fn my_product', to_regprocedure('public.my_product(uuid)') is not null),
  ('fn cc_unzoned_addresses', to_regprocedure('public.cc_unzoned_addresses()') is not null),
  ('fn auto_plan_trips', to_regprocedure('public.auto_plan_trips(date)') is not null),
  ('fn cc_unplanned_orders', to_regprocedure('public.cc_unplanned_orders(date)') is not null),
  ('fn reoptimise_trip', to_regprocedure('public.reoptimise_trip(uuid)') is not null),
  ('fn save_trip_order', to_regprocedure('public.save_trip_order(uuid,uuid[],numeric,integer,text)') is not null),
  ('fn missed_stops_check', to_regprocedure('public.missed_stops_check()') is not null),
  ('get_home has pickup', pg_get_functiondef('public.get_home()'::regprocedure) like '%''pickup''%'),
  ('cron auto plan', exists (select 1 from cron.job where jobname='sunrich_auto_plan_trips')),
  ('cron missed stops', exists (select 1 from cron.job where jobname='sunrich_missed_stops_check')),
  ('anon cannot auto plan', not has_function_privilege('anon', 'public.auto_plan_trips(date)', 'execute')),
  ('clients cannot run jobs', not has_function_privilege('authenticated', 'public.job_auto_plan_trips()', 'execute'))
) o(name, ok);

-- ───────────────────────── ROLLBACK (run manually if needed) ─────────────────────────
-- select cron.unschedule('sunrich_auto_plan_trips');
-- select cron.unschedule('sunrich_missed_stops_check');
-- drop function if exists public.job_missed_stops_check(), public.job_auto_plan_trips(), public.missed_stops_check(),
--   public.save_trip_order(uuid,uuid[],numeric,integer,text), public.reoptimise_trip(uuid), public.cc_unplanned_orders(date),
--   public.auto_plan_trips(date), public._auto_plan(date,uuid), public._plan_candidates_load(uuid), public._plan_candidates(date,uuid),
--   public._optimise_trip(uuid,text), public._hav_km(float8,float8,float8,float8), public.cc_unzoned_addresses(), public.my_product(uuid);
-- drop trigger if exists customer_addresses_set_area on public.customer_addresses;
-- drop function if exists public._address_set_area(), public._area_for_point(uuid,numeric,numeric),
--   public._point_in_boundary(numeric,numeric,jsonb), public._geo_rings(jsonb);
-- Restore get_home() from database/20261103_app_redesign.sql, then:
-- drop function if exists public._pickup_for_customer(uuid,uuid);
-- alter table public.vehicles drop column if exists capacity_jars, drop column if exists capacity_boxes;
-- alter table public.app_settings drop column if exists google_routes_enabled, drop column if exists google_routes_min_stops,
--   drop column if exists plan_time, drop column if exists auto_plan_last_date, drop column if exists launch_image_url, drop column if exists login_image_url;
-- alter table public.customer_addresses drop column if exists area_id;
-- alter table public.units drop column if exists pickup_hours, drop column if exists pickup_hours_hi, drop column if exists pickup_hours_mr;
-- alter table public.geo_areas drop column if exists unit_id, drop column if exists default_vehicle_id;
-- drop index if exists public.product_images_one_primary;
-- alter table public.product_images drop column if exists is_primary, drop column if exists alt;
-- alter table public.products drop constraint if exists products_highlights_array_chk, drop constraint if exists products_faqs_array_chk,
--   drop column if exists highlights, drop column if exists faqs, drop column if exists delivery_info,
--   drop column if exists delivery_info_hi, drop column if exists delivery_info_mr;
