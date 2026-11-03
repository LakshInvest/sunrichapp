-- Cleanup for the QA test order MFO/26-27/00024 (QA Retailer, ₹330, UPI, cancelled).
-- NOT run. Review, then run once in the SQL editor.
begin;
with o as (select id from public.orders where id = 'dd5e9641-7c7e-4a62-b0d9-4517a0bfab57' and order_no = 'MFO/26-27/00024' and status = 'cancelled')
, p as (select id from public.payment_proofs where order_id in (select id from o))
, n as (delete from public.staff_notifications where ref_id in (select id from o union all select id from p) returning 1)
, s as (delete from public.stock_movements where ref_id in (select id from o) returning 1)
, a as (delete from public.audit_logs where entity_id in (select id from o union all select id from p) returning 1)
, pp as (delete from public.payment_proofs where id in (select id from p) returning 1)
, f as (delete from public.order_feedback where order_id in (select id from o) returning 1)
, h as (delete from public.order_status_history where order_id in (select id from o) returning 1)
, l as (delete from public.order_lines where order_id in (select id from o) returning 1)
delete from public.orders where id in (select id from o);
commit;
