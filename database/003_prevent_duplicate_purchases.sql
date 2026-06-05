do $$
begin
  create unique index purchases_unique_supplier_invoice_guard_idx
  on public.purchases (
    user_id,
    party_id,
    invoice_date,
    lower(btrim(description)),
    amount_ttc
  );
exception
  when duplicate_table or duplicate_object then null;
  when unique_violation then
    raise notice 'Des doublons existent deja dans public.purchases. Supprimez ou corrigez les doublons avant de rejouer ce script.';
end $$;
