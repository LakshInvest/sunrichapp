-- =====================================================================
-- Sunrich Khata (customer ledger & payments) — 2026-11-01  (v2)
-- Additive only and safe to re-run. Builds on the existing R5 Finance
-- tables: receipts, receipt_allocations, invoices, payment_proofs,
-- customer_opening_balances, credit_debit_notes. It doesn't touch existing data.
-- The only existing function replaced is credit_status (same signature);
-- its original definition is in the ROLLBACK section below.
-- =====================================================================

-- =====================================================================
-- ROLLBACK (do not run with the rest; copy/paste to restore credit_status)
-- =====================================================================
-- CREATE OR REPLACE FUNCTION public.credit_status(p_customer_id uuid, p_firm_id uuid DEFAULT NULL::uuid)
--  RETURNS TABLE(out_limit numeric, out_days integer, out_outstanding numeric, out_overdue numeric, out_oldest_overdue_days integer, out_available numeric, out_blocked boolean, out_block_reason text)
--  LANGUAGE plpgsql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- declare
--   v_c     public.customers;
--   v_limit numeric;
--   v_days  int;
--   v_zone  uuid;
--   v_out   numeric;
--   v_od    numeric;
--   v_odd   int;
--   v_temp  numeric;
-- begin
--   if not (public.has_perm('credit', 'view') or public.has_perm('orders', 'view') or public.has_perm('orders', 'create')
--           or public.has_perm('dispatch', 'view') or public.my_customer_id() = p_customer_id) then
--     raise exception 'Not allowed';
--   end if;
--   select * into v_c from public.customers c where c.id = p_customer_id;
--   select l.zone_id into v_zone from public.customer_location(p_customer_id) l;
--
--   select f.credit_limit, f.credit_days into v_limit, v_days
--     from public.customer_firm_credit f where f.customer_id = p_customer_id and f.firm_id = p_firm_id;
--   if v_limit is null and v_c.credit_limit is not null then
--     v_limit := v_c.credit_limit; v_days := coalesce(v_c.credit_days, 0);
--   end if;
--   if v_limit is null and v_zone is not null then
--     select z.credit_limit, z.credit_days into v_limit, v_days
--       from public.credit_zone_defaults z where z.zone_id = v_zone and z.customer_type_id = v_c.customer_type_id;
--   end if;
--   if v_limit is null then
--     select t.default_credit_limit, t.default_credit_days into v_limit, v_days
--       from public.customer_types t where t.id = v_c.customer_type_id;
--   end if;
--
--   select coalesce(sum(t.extra_amount), 0) into v_temp
--     from public.temp_credit_limits t
--    where t.customer_id = p_customer_id and t.valid_till >= current_date
--      and (t.firm_id is null or t.firm_id = p_firm_id);
--
--   select coalesce(sum(o.grand_total - o.amount_paid), 0) into v_out
--     from public.orders o
--    where o.customer_id = p_customer_id and o.fulfiller_customer_id is null and o.payment_mode = 'credit' and o.payment_status <> 'paid'
--      and o.status in ('approved', 'processing', 'dispatched', 'delivered', 'closed')
--      and (p_firm_id is null or o.firm_id = p_firm_id);
--
--   select coalesce(sum(o.grand_total - o.amount_paid), 0), coalesce(max(current_date - o.due_date), 0)
--     into v_od, v_odd
--     from public.orders o
--    where o.customer_id = p_customer_id and o.fulfiller_customer_id is null and o.payment_mode = 'credit' and o.payment_status <> 'paid'
--      and o.status in ('delivered', 'closed') and o.due_date < current_date
--      and (p_firm_id is null or o.firm_id = p_firm_id);
--
--   return query select
--     coalesce(v_limit, 0) + v_temp, coalesce(v_days, 0), v_out, v_od, v_odd,
--     greatest(coalesce(v_limit, 0) + v_temp - v_out, 0),
--     v_c.credit_blocked, v_c.credit_block_reason;
-- end;
-- $function$;
-- To remove the advance trigger as well:
-- drop trigger if exists invoices_use_advance on public.invoices;
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. New fields on payments
-- ---------------------------------------------------------------------
alter table public.payment_proofs add column if not exists source text not null default 'customer_app';
alter table public.payment_proofs add column if not exists collected_by uuid references auth.users(id);
alter table public.payment_proofs add column if not exists cash_paid_to text;          -- office / salesman / driver
alter table public.payment_proofs add column if not exists cash_paid_to_name text;
alter table public.payment_proofs add column if not exists cheque_no text;
alter table public.payment_proofs add column if not exists cheque_bank text;
alter table public.payment_proofs add column if not exists cheque_date date;
alter table public.payment_proofs add column if not exists firm_id uuid references public.firms(id);
alter table public.payment_proofs add column if not exists balance_after numeric;     -- ledger balance right after verification (for the notice)

alter table public.receipts add column if not exists collected_by uuid references auth.users(id);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'payment_proofs_source_chk') then
    alter table public.payment_proofs add constraint payment_proofs_source_chk
      check (source in ('customer_app', 'cc', 'team_app')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payment_proofs_cash_to_chk') then
    alter table public.payment_proofs add constraint payment_proofs_cash_to_chk
      check (cash_paid_to is null or cash_paid_to in ('office', 'salesman', 'driver')) not valid;
  end if;
end $$;

create index if not exists payment_proofs_customer_status_idx on public.payment_proofs (customer_id, status, created_at desc);
create index if not exists payment_proofs_customer_ref_idx on public.payment_proofs (customer_id, lower(reference));
create index if not exists receipt_allocations_receipt_idx on public.receipt_allocations (receipt_id);

-- ---------------------------------------------------------------------
-- 2. Allocation history (every allocate / un-allocate is kept)
-- ---------------------------------------------------------------------
create table if not exists public.receipt_allocation_history (
  id          uuid primary key default gen_random_uuid(),
  receipt_id  uuid not null references public.receipts(id) on delete cascade,
  invoice_id  uuid references public.invoices(id) on delete set null,
  opening_id  uuid references public.customer_opening_balances(id) on delete set null,
  amount      numeric not null,
  action      text not null check (action in ('allocated', 'removed')),
  changed_by  uuid,
  changed_at  timestamptz not null default now()
);
grant select on public.receipt_allocation_history to authenticated;
grant all on public.receipt_allocation_history to service_role;
alter table public.receipt_allocation_history enable row level security;
drop policy if exists rah_read on public.receipt_allocation_history;
create policy rah_read on public.receipt_allocation_history for select to authenticated
  using (exists (select 1 from public.receipts r where r.id = receipt_allocation_history.receipt_id));  -- inherits receipts RLS

create or replace function public._alloc_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.receipt_allocation_history (receipt_id, invoice_id, opening_id, amount, action, changed_by)
    values (new.receipt_id, new.invoice_id, new.opening_id, new.amount, 'allocated', auth.uid());
    return new;
  end if;
  insert into public.receipt_allocation_history (receipt_id, invoice_id, opening_id, amount, action, changed_by)
  values (old.receipt_id, old.invoice_id, old.opening_id, old.amount, 'removed', auth.uid());
  return old;
end $$;
drop trigger if exists ra_history on public.receipt_allocations;
create trigger ra_history after insert or delete on public.receipt_allocations
  for each row execute function public._alloc_history();

-- ---------------------------------------------------------------------
-- 3. Internal ledger helpers (no permission filter; NOT callable by users)
--    customer_open_bills filters rows by has_perm/my_customer_id, so it
--    returns nothing for dispatch/billing users. These internal versions
--    are used by triggers and finance functions instead.
-- ---------------------------------------------------------------------
create or replace function public._open_bills(p_customer_id uuid, p_firm_id uuid)
returns table(kind text, ref_id uuid, bill_date date, balance numeric)
language sql stable security definer set search_path = public as $$
  select 'opening', ob.id, ob.as_of, ob.amount - ob.amount_paid
    from public.customer_opening_balances ob
   where ob.customer_id = p_customer_id and (p_firm_id is null or ob.firm_id = p_firm_id)
     and ob.amount - ob.amount_paid > 0
  union all
  select 'invoice', i.id, i.invoice_date, i.grand_total - i.amount_paid
    from public.invoices i
   where i.customer_id = p_customer_id and (p_firm_id is null or i.firm_id = p_firm_id)
     and i.status = 'issued' and i.grand_total - i.amount_paid > 0
  order by 3, 2;
$$;

create or replace function public._advance(p_customer_id uuid, p_firm_id uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(r.amount - coalesce((select sum(a.amount) from public.receipt_allocations a where a.receipt_id = r.id), 0)), 0)
    from public.receipts r
   where r.customer_id = p_customer_id and r.status = 'posted' and coalesce(r.cheque_status, '') <> 'bounced'
     and (p_firm_id is null or r.firm_id = p_firm_id);
$$;

-- FIFO allocation of one receipt to its OWN customer's bills of the SAME firm
-- as the receipt. Builds an explicit list and hands it to the existing
-- _allocate, so the existing ra_sync trigger refreshes invoices AND
-- orders.amount_paid / payment_status (via _refresh_invoice_paid).
create or replace function public._fifo_allocate(p_receipt_id uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_r public.receipts; v_left numeric; v_b record; v_amt numeric; v_list jsonb := '[]'::jsonb;
begin
  select * into v_r from public.receipts where id = p_receipt_id;
  if v_r.id is null or v_r.status <> 'posted' or coalesce(v_r.cheque_status, '') = 'bounced' then return 0; end if;
  v_left := v_r.amount - coalesce((select sum(amount) from public.receipt_allocations where receipt_id = p_receipt_id), 0);
  for v_b in select * from public._open_bills(v_r.customer_id, v_r.firm_id) loop
    exit when v_left <= 0;
    v_amt := least(v_left, v_b.balance);
    v_list := v_list || jsonb_build_object(
      'invoice_id', case when v_b.kind = 'invoice' then v_b.ref_id end,
      'opening_id', case when v_b.kind = 'opening' then v_b.ref_id end,
      'amount', v_amt);
    v_left := v_left - v_amt;
  end loop;
  if jsonb_array_length(v_list) = 0 then return v_left; end if;
  return public._allocate(p_receipt_id, v_list);
end $$;

-- Explicit allocations (CC re-allocation / verify with a chosen list):
-- every line must be a bill of the receipt's customer AND firm, and no
-- line may exceed that bill's open balance.
create or replace function public._check_allocations(p_receipt_id uuid, p_allocations jsonb)
returns void language plpgsql stable security definer set search_path = public as $$
declare v_r public.receipts; v_a jsonb; v_amt numeric; v_bal numeric;
begin
  select * into v_r from public.receipts where id = p_receipt_id;
  for v_a in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) loop
    v_amt := (v_a ->> 'amount')::numeric;
    if v_amt is null or v_amt <= 0 then continue; end if;
    if nullif(v_a ->> 'invoice_id', '') is not null then
      select i.grand_total - i.amount_paid into v_bal from public.invoices i
       where i.id = (v_a ->> 'invoice_id')::uuid and i.customer_id = v_r.customer_id and i.firm_id = v_r.firm_id and i.status = 'issued';
    elsif nullif(v_a ->> 'opening_id', '') is not null then
      select ob.amount - ob.amount_paid into v_bal from public.customer_opening_balances ob
       where ob.id = (v_a ->> 'opening_id')::uuid and ob.customer_id = v_r.customer_id and ob.firm_id = v_r.firm_id;
    else
      raise exception 'Choose a bill for each allocation';
    end if;
    if v_bal is null then raise exception 'Bill is not of this customer and firm'; end if;
    if v_amt > v_bal then raise exception 'Allocation is more than the bill balance'; end if;
  end loop;
end $$;

-- Spend a customer's advance on their open bills of ONE firm:
-- oldest receipt first → oldest bill first. Never crosses firms.
create or replace function public._apply_advance(p_customer_id uuid, p_firm_id uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_r record; v_used numeric := 0; v_before numeric;
begin
  if p_firm_id is null then return 0; end if;
  for v_r in
    select r.id, r.amount - coalesce((select sum(a.amount) from public.receipt_allocations a where a.receipt_id = r.id), 0) as unalloc
      from public.receipts r
     where r.customer_id = p_customer_id and r.firm_id = p_firm_id
       and r.status = 'posted' and coalesce(r.cheque_status, '') <> 'bounced'
     order by r.receipt_date, r.created_at
  loop
    continue when v_r.unalloc <= 0;
    exit when not exists (select 1 from public._open_bills(p_customer_id, p_firm_id));
    v_before := v_r.unalloc;
    v_used := v_used + (v_before - public._fifo_allocate(v_r.id));
  end loop;
  return v_used;
end $$;

-- Bill issued → use any advance on it automatically (every source).
-- _generate_invoice inserts the invoice with grand_total = 0 and fills the
-- total in a follow-up UPDATE, so the trigger also fires on grand_total.
-- Runs SECURITY DEFINER with no permission checks, so dispatch/billing
-- users issuing a bill can never be blocked by it; any unexpected error is
-- swallowed so billing itself never fails (finance can allocate from CC).
create or replace function public._invoice_use_advance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'issued' and new.grand_total > 0
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.grand_total is distinct from new.grand_total) then
    begin
      perform public._apply_advance(new.customer_id, new.firm_id);
    exception when others then
      raise warning 'Khata: advance not applied to invoice %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end $$;
drop trigger if exists invoices_use_advance on public.invoices;
create trigger invoices_use_advance after insert or update of status, grand_total on public.invoices
  for each row execute function public._invoice_use_advance();

-- Public (permission-checked) advance read for the app / CC.
create or replace function public.customer_advance(p_customer_id uuid, p_firm_id uuid default null)
returns numeric language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_perm('finance', 'view') or public.has_perm('credit', 'view') or public.has_perm('orders', 'view')
          or public.has_perm('orders', 'create') or public.has_perm('dispatch', 'view') or public.my_customer_id() = p_customer_id) then
    raise exception 'Not allowed';
  end if;
  return public._advance(p_customer_id, p_firm_id);
end $$;

-- ---------------------------------------------------------------------
-- 4. Credit check uses the ledger after advance (same signature/logic,
--    outstanding is reduced by the customer's advance).
--    Consistency: when advance is used on a bill, _allocate → ra_sync →
--    _refresh_invoice_paid updates orders.amount_paid, so that order's
--    outstanding drops and the advance drops by the same amount — no
--    double counting.
-- ---------------------------------------------------------------------
create or replace function public.credit_status(p_customer_id uuid, p_firm_id uuid default null)
returns table(out_limit numeric, out_days integer, out_outstanding numeric, out_overdue numeric, out_oldest_overdue_days integer, out_available numeric, out_blocked boolean, out_block_reason text)
language plpgsql stable security definer set search_path = public as $function$
declare
  v_c     public.customers;
  v_limit numeric;
  v_days  int;
  v_zone  uuid;
  v_out   numeric;
  v_od    numeric;
  v_odd   int;
  v_temp  numeric;
begin
  if not (public.has_perm('credit', 'view') or public.has_perm('orders', 'view') or public.has_perm('orders', 'create')
          or public.has_perm('dispatch', 'view') or public.my_customer_id() = p_customer_id) then
    raise exception 'Not allowed';
  end if;
  select * into v_c from public.customers c where c.id = p_customer_id;
  select l.zone_id into v_zone from public.customer_location(p_customer_id) l;

  select f.credit_limit, f.credit_days into v_limit, v_days
    from public.customer_firm_credit f where f.customer_id = p_customer_id and f.firm_id = p_firm_id;
  if v_limit is null and v_c.credit_limit is not null then
    v_limit := v_c.credit_limit; v_days := coalesce(v_c.credit_days, 0);
  end if;
  if v_limit is null and v_zone is not null then
    select z.credit_limit, z.credit_days into v_limit, v_days
      from public.credit_zone_defaults z where z.zone_id = v_zone and z.customer_type_id = v_c.customer_type_id;
  end if;
  if v_limit is null then
    select t.default_credit_limit, t.default_credit_days into v_limit, v_days
      from public.customer_types t where t.id = v_c.customer_type_id;
  end if;

  select coalesce(sum(t.extra_amount), 0) into v_temp
    from public.temp_credit_limits t
   where t.customer_id = p_customer_id and t.valid_till >= current_date
     and (t.firm_id is null or t.firm_id = p_firm_id);

  select coalesce(sum(o.grand_total - o.amount_paid), 0) into v_out
    from public.orders o
   where o.customer_id = p_customer_id and o.fulfiller_customer_id is null and o.payment_mode = 'credit' and o.payment_status <> 'paid'
     and o.status in ('approved', 'processing', 'dispatched', 'delivered', 'closed')
     and (p_firm_id is null or o.firm_id = p_firm_id);

  -- Khata: advance (unallocated receipts, same firm filter) lowers the outstanding.
  v_out := greatest(v_out - public._advance(p_customer_id, p_firm_id), 0);

  select coalesce(sum(o.grand_total - o.amount_paid), 0), coalesce(max(current_date - o.due_date), 0)
    into v_od, v_odd
    from public.orders o
   where o.customer_id = p_customer_id and o.fulfiller_customer_id is null and o.payment_mode = 'credit' and o.payment_status <> 'paid'
     and o.status in ('delivered', 'closed') and o.due_date < current_date
     and (p_firm_id is null or o.firm_id = p_firm_id);

  return query select
    coalesce(v_limit, 0) + v_temp, coalesce(v_days, 0), v_out, v_od, v_odd,
    greatest(coalesce(v_limit, 0) + v_temp - v_out, 0),
    v_c.credit_blocked, v_c.credit_block_reason;
end;
$function$;

-- ---------------------------------------------------------------------
-- 5. Customer: submit a payment (pending verification, source customer_app)
-- ---------------------------------------------------------------------
create or replace function public.submit_my_payment(
  p_amount numeric, p_method text, p_reference text default null, p_paid_on date default current_date,
  p_screenshot_path text default null, p_cash_paid_to text default null, p_cash_paid_to_name text default null,
  p_cheque_no text default null, p_cheque_bank text default null, p_cheque_date date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_cid uuid := public.my_customer_id(); v_id uuid; v_company uuid; v_ref text := nullif(trim(coalesce(p_reference, '')), '');
begin
  if not public.my_session_is_valid() or v_cid is null then raise exception 'Not allowed'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount more than zero'; end if;
  if p_method is null or p_method not in ('upi', 'bank', 'cash', 'cheque') then raise exception 'Choose how you paid'; end if;
  if p_paid_on is not null and p_paid_on > current_date then raise exception 'Payment date cannot be in the future'; end if;
  if p_method in ('upi', 'bank') and v_ref is null and p_screenshot_path is null then
    raise exception 'Add the UTR / reference number or a screenshot';
  end if;
  if p_method = 'cash' and (p_cash_paid_to is null or p_cash_paid_to not in ('office', 'salesman', 'driver')) then
    raise exception 'Choose who you paid the cash to';
  end if;
  if p_method = 'cheque' and nullif(trim(coalesce(p_cheque_no, '')), '') is null then raise exception 'Enter the cheque number'; end if;
  if v_ref is not null and exists (
       select 1 from public.payment_proofs
        where customer_id = v_cid and status <> 'rejected' and lower(reference) = lower(v_ref)) then
    raise exception 'This payment is already reported';
  end if;
  if p_screenshot_path is not null and p_screenshot_path not like v_cid::text || '/%' then raise exception 'Invalid file path'; end if;
  if (select count(*) from public.payment_proofs where customer_id = v_cid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Too many payment reports today. Please contact support.';
  end if;
  select company_id into v_company from public.customers where id = v_cid;
  insert into public.payment_proofs (company_id, customer_id, amount, method, reference, paid_on, screenshot_path, source,
                                     cash_paid_to, cash_paid_to_name, cheque_no, cheque_bank, cheque_date, submitted_by)
  values (v_company, v_cid, p_amount, p_method, v_ref, coalesce(p_paid_on, current_date),
          p_screenshot_path, 'customer_app', p_cash_paid_to, nullif(trim(coalesce(p_cash_paid_to_name, '')), ''),
          nullif(trim(coalesce(p_cheque_no, '')), ''), nullif(trim(coalesce(p_cheque_bank, '')), ''), p_cheque_date, auth.uid())
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.submit_my_payment(numeric, text, text, date, text, text, text, text, text, date) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Finance (CC / Team app): verify → exactly ONE receipt + FIFO + advance
--    The existing review_payment_proof(p_id, true, receipt_id) only sets
--    status/reviewer/receipt_id (and releases a held dispatch batch); it
--    creates no receipt and allocates nothing. So this function creates the
--    single receipt, then calls it with that receipt_id.
--    Reject uses the existing review_payment_proof(p_id, false, null, reason).
-- ---------------------------------------------------------------------
create or replace function public.verify_payment_proof(p_id uuid, p_firm_id uuid default null, p_allocations jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_p public.payment_proofs; v_firm uuid; v_rid uuid; v_left numeric; v_bal numeric;
begin
  if not (public.has_perm('finance', 'edit') or public.has_perm('finance', 'create')) then raise exception 'Not allowed'; end if;
  select * into v_p from public.payment_proofs where id = p_id and company_id = public.my_company_id() for update;
  if v_p.id is null then raise exception 'Payment report not found'; end if;
  if v_p.status <> 'pending' then raise exception 'Already reviewed'; end if;
  if v_p.receipt_id is not null then raise exception 'A receipt already exists for this payment'; end if;

  v_firm := coalesce(p_firm_id, v_p.firm_id,
                     (select b.ref_firm from (
                        select i.firm_id ref_firm, i.invoice_date d from public.invoices i
                         where i.customer_id = v_p.customer_id and i.status = 'issued' and i.grand_total - i.amount_paid > 0
                        union all
                        select ob.firm_id, ob.as_of from public.customer_opening_balances ob
                         where ob.customer_id = v_p.customer_id and ob.amount - ob.amount_paid > 0) b
                       order by b.d limit 1),
                     (select o.firm_id from public.orders o where o.customer_id = v_p.customer_id order by o.created_at desc limit 1),
                     (select f.id from public.firms f where f.company_id = v_p.company_id order by f.created_at limit 1));

  v_rid := public._create_receipt(v_firm, v_p.customer_id, v_p.method, v_p.amount, v_p.paid_on, v_p.reference, null,
                                  v_p.cheque_no, v_p.cheque_date, v_p.cheque_bank, null, v_p.source, null,
                                  'Payment report ' || v_p.id::text);
  update public.receipts set collected_by = v_p.collected_by where id = v_rid;

  if p_allocations is not null and jsonb_array_length(p_allocations) > 0 then
    perform public._check_allocations(v_rid, p_allocations);
    v_left := public._allocate(v_rid, p_allocations);
  else
    v_left := public._fifo_allocate(v_rid);                 -- oldest bill of the same firm first
  end if;

  perform public.review_payment_proof(p_id, true, v_rid, null);

  select coalesce(sum(b.balance), 0) into v_bal from public._open_bills(v_p.customer_id, null) b;
  v_bal := v_bal - public._advance(v_p.customer_id, null);
  update public.payment_proofs set firm_id = v_firm, balance_after = v_bal where id = p_id;

  return jsonb_build_object('receipt_id', v_rid, 'advance', v_left, 'balance', v_bal);
end $$;
grant execute on function public.verify_payment_proof(uuid, uuid, jsonb) to authenticated;

-- Finance: record a salesman / office collection directly (source cc or team_app).
create or replace function public.record_collection(
  p_customer_id uuid, p_amount numeric, p_method text, p_source text default 'cc', p_collected_by uuid default null,
  p_reference text default null, p_paid_on date default current_date, p_firm_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_company uuid;
begin
  if not (public.has_perm('finance', 'create') or public.has_perm('finance', 'edit')) then raise exception 'Not allowed'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount more than zero'; end if;
  if p_method is null or p_method not in ('upi', 'bank', 'cash', 'cheque') then raise exception 'Choose the payment mode'; end if;
  if p_source not in ('cc', 'team_app') then raise exception 'Invalid source'; end if;
  if p_paid_on is not null and p_paid_on > current_date then raise exception 'Payment date cannot be in the future'; end if;
  select company_id into v_company from public.customers where id = p_customer_id and company_id = public.my_company_id();
  if v_company is null then raise exception 'Customer not found'; end if;
  insert into public.payment_proofs (company_id, customer_id, amount, method, reference, paid_on, source, collected_by, firm_id, submitted_by)
  values (v_company, p_customer_id, p_amount, p_method, nullif(trim(coalesce(p_reference, '')), ''), coalesce(p_paid_on, current_date),
          p_source, coalesce(p_collected_by, auth.uid()), p_firm_id, auth.uid())
  returning id into v_id;
  return public.verify_payment_proof(v_id, p_firm_id, null);
end $$;
grant execute on function public.record_collection(uuid, numeric, text, text, uuid, text, date, uuid) to authenticated;

-- Finance: re-allocate a receipt to specific bills (history kept by trigger).
create or replace function public.reallocate_receipt(p_receipt_id uuid, p_allocations jsonb)
returns numeric language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('finance', 'edit') then raise exception 'Not allowed'; end if;
  if (select status from public.receipts where id = p_receipt_id and company_id = public.my_company_id()) is distinct from 'posted' then
    raise exception 'Receipt is not active';
  end if;
  delete from public.receipt_allocations where receipt_id = p_receipt_id;   -- ra_sync refreshes the freed bills
  if p_allocations is null or jsonb_array_length(p_allocations) = 0 then
    return public._fifo_allocate(p_receipt_id);
  end if;
  perform public._check_allocations(p_receipt_id, p_allocations);
  return public._allocate(p_receipt_id, p_allocations);
end $$;
grant execute on function public.reallocate_receipt(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Customer: Khata summary + statement data
-- ---------------------------------------------------------------------
create or replace function public.my_khata_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_cid uuid := public.my_customer_id(); v_due numeric; v_adv numeric; v_cs record; v_oldest date; v_pending numeric;
begin
  if v_cid is null then raise exception 'Not allowed'; end if;
  select coalesce(sum(balance), 0), min(bill_date) into v_due, v_oldest from public._open_bills(v_cid, null);
  v_adv := public._advance(v_cid, null);
  select * into v_cs from public.credit_status(v_cid, null);
  select coalesce(sum(amount), 0) into v_pending from public.payment_proofs where customer_id = v_cid and status = 'pending';
  return jsonb_build_object(
    'due', v_due, 'advance', v_adv, 'balance', v_due - v_adv,            -- >0 due, <0 advance
    'credit_limit', v_cs.out_limit, 'available', v_cs.out_available,
    'overdue', v_cs.out_overdue, 'oldest_unpaid', v_oldest, 'pending_payments', v_pending);
end $$;
grant execute on function public.my_khata_summary() to authenticated;

-- Passbook / statement rows for the signed-in customer, with links to open bills.
create or replace function public.my_khata_statement(p_from date, p_to date)
returns table(entry_date date, entry_type text, ref_no text, description text, debit numeric, credit numeric, balance numeric,
              invoice_id uuid, order_id uuid)
language sql stable security definer set search_path = public as $$
  select s.entry_date, s.entry_type, s.ref_no, s.description, s.debit, s.credit, s.balance, i.id, i.order_id
    from public.customer_statement(public.my_customer_id(), p_from, p_to, null) s
    left join public.invoices i on s.entry_type = 'invoice' and i.invoice_no = s.ref_no and i.customer_id = public.my_customer_id()
   where public.my_customer_id() is not null;
$$;
grant execute on function public.my_khata_statement(date, date) to authenticated;

grant execute on function public.customer_advance(uuid, uuid) to authenticated;

-- Internal helpers: not callable through the API.
revoke execute on function public._open_bills(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._advance(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._fifo_allocate(uuid) from public, anon, authenticated;
revoke execute on function public._check_allocations(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public._apply_advance(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._alloc_history() from public, anon, authenticated;
revoke execute on function public._invoice_use_advance() from public, anon, authenticated;

-- Notifications: the app builds its feed from customer-readable rows, so
-- payment_proofs.status / reviewed_at / reject_reason / balance_after
-- (RLS pp_read) drive the "verified" and "rejected" notices. No table needed.
