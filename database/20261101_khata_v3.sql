-- =====================================================================
-- Sunrich Khata v3 — order-linked payments go to that order's bill first.
-- Run after 20261101_khata.sql (v2). Safe to re-run (create or replace).
-- It doesn't touch existing data.
--
-- Rule:
--   payment_proofs.order_id IS NOT NULL (payment made for one order):
--     * order's bill issued and open  → that bill first, remainder FIFO
--     * order's bill not issued yet   → keep as advance; when that bill is
--                                       issued it is used on THAT bill first
--     * order's bill issued but paid  → strict FIFO
--   everything else (Khata "Pay now", CC / salesman collections, team app):
--     strict FIFO (oldest bill of the same firm first), as in v2.
--
-- ROLLBACK: re-run sections 6 (verify_payment_proof) and 3
-- (_invoice_use_advance) of 20261101_khata.sql (v2).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. verify_payment_proof: order-first allocation
-- ---------------------------------------------------------------------
create or replace function public.verify_payment_proof(p_id uuid, p_firm_id uuid default null, p_allocations jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_p     public.payment_proofs;
  v_firm  uuid;
  v_rid   uuid;
  v_left  numeric;
  v_bal   numeric;
  v_inv   public.invoices;
  v_amt   numeric;
  v_hold  boolean := false;   -- order bill not issued yet → keep as advance
begin
  if not (public.has_perm('finance', 'edit') or public.has_perm('finance', 'create')) then raise exception 'Not allowed'; end if;
  select * into v_p from public.payment_proofs where id = p_id and company_id = public.my_company_id() for update;
  if v_p.id is null then raise exception 'Payment report not found'; end if;
  if v_p.status <> 'pending' then raise exception 'Already reviewed'; end if;
  if v_p.receipt_id is not null then raise exception 'A receipt already exists for this payment'; end if;

  -- Order-linked: the receipt belongs to the order's firm.
  if v_p.order_id is not null then
    select * into v_inv from public.invoices where order_id = v_p.order_id and customer_id = v_p.customer_id
      order by created_at desc limit 1;
    v_firm := coalesce(p_firm_id, v_p.firm_id, v_inv.firm_id,
                       (select o.firm_id from public.orders o where o.id = v_p.order_id and o.customer_id = v_p.customer_id));
  end if;

  v_firm := coalesce(v_firm, p_firm_id, v_p.firm_id,
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
    -- Finance chose the bills explicitly.
    perform public._check_allocations(v_rid, p_allocations);
    v_left := public._allocate(v_rid, p_allocations);
  elsif v_p.order_id is not null then
    if v_inv.id is null or v_inv.status <> 'issued' or v_inv.grand_total <= 0 then
      v_hold := true;                                   -- bill not issued yet: whole amount stays advance
      v_left := v_p.amount;
    else
      v_amt := least(v_p.amount, v_inv.grand_total - v_inv.amount_paid);
      if v_amt > 0 and v_inv.firm_id = v_firm then
        perform public._allocate(v_rid, jsonb_build_array(jsonb_build_object('invoice_id', v_inv.id, 'amount', v_amt)));
      end if;
      v_left := public._fifo_allocate(v_rid);           -- remainder: oldest bill first
    end if;
  else
    v_left := public._fifo_allocate(v_rid);             -- Khata / collections: strict FIFO
  end if;

  perform public.review_payment_proof(p_id, true, v_rid, null);

  select coalesce(sum(b.balance), 0) into v_bal from public._open_bills(v_p.customer_id, null) b;
  v_bal := v_bal - public._advance(v_p.customer_id, null);
  update public.payment_proofs set firm_id = v_firm, balance_after = v_bal where id = p_id;

  return jsonb_build_object('receipt_id', v_rid, 'advance', v_left, 'balance', v_bal, 'held_for_order', v_hold);
end $$;
grant execute on function public.verify_payment_proof(uuid, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Bill issued → first use money that was paid FOR THIS ORDER (held as
--    advance), then any other advance FIFO. Same safety as v2: no
--    permission checks, errors never block billing.
-- ---------------------------------------------------------------------
create or replace function public._invoice_use_advance()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_r record; v_open numeric; v_amt numeric;
begin
  if new.status = 'issued' and new.grand_total > 0
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.grand_total is distinct from new.grand_total) then
    begin
      if new.order_id is not null then
        for v_r in
          select r.id,
                 r.amount - coalesce((select sum(a.amount) from public.receipt_allocations a where a.receipt_id = r.id), 0) as unalloc
            from public.payment_proofs pp
            join public.receipts r on r.id = pp.receipt_id
           where pp.order_id = new.order_id and pp.status = 'verified'
             and r.customer_id = new.customer_id and r.firm_id = new.firm_id
             and r.status = 'posted' and coalesce(r.cheque_status, '') <> 'bounced'
           order by r.receipt_date, r.created_at
        loop
          select grand_total - amount_paid into v_open from public.invoices where id = new.id;
          exit when coalesce(v_open, 0) <= 0;
          v_amt := least(v_r.unalloc, v_open);
          if v_amt > 0 then
            perform public._allocate(v_r.id, jsonb_build_array(jsonb_build_object('invoice_id', new.id, 'amount', v_amt)));
          end if;
        end loop;
      end if;
      perform public._apply_advance(new.customer_id, new.firm_id);   -- the rest: oldest bill first
    exception when others then
      raise warning 'Khata: advance not applied to invoice %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end $$;
revoke execute on function public._invoice_use_advance() from public, anon, authenticated;
