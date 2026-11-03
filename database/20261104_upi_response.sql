-- Prompt-44: keep the UPI app's raw reply with a payment proof (info for finance only).
-- NOT RUN. Review, then run once in the SQL editor.
-- The proof is still created as status 'pending'; nothing here marks a payment paid.

alter table public.payment_proofs
  add column if not exists upi_response jsonb;

comment on column public.payment_proofs.upi_response is
  'Raw reply from the customer''s UPI app (Status, txnId, ApprovalRefNo/UTR, responseCode, raw). Unverified — finance must still check the bank.';

-- The customer attaches the reply to their own proof, only while it is still pending.
create or replace function public.attach_upi_response(p_proof_id uuid, p_response jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  update public.payment_proofs
     set upi_response = p_response
   where id = p_proof_id
     and submitted_by = auth.uid()
     and status = 'pending';
end;
$$;

revoke all on function public.attach_upi_response(uuid, jsonb) from public, anon;
grant execute on function public.attach_upi_response(uuid, jsonb) to authenticated;
