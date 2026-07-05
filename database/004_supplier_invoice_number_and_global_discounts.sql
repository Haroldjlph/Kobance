alter type public.invoice_status add value if not exists 'DRAFT';

alter table public.invoices add column if not exists discount_type text not null default 'NONE';
alter table public.invoices add column if not exists discount_value numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists discount_amount numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists total_ht_before_discount numeric(12, 2) not null default 0;

alter table public.purchases add column if not exists supplier_invoice_number text;

alter table public.purchase_lines alter column description set default '';
update public.purchase_lines set description = '' where description is null;

drop index if exists public.purchases_unique_supplier_invoice_guard_idx;
do $$
begin
  create unique index purchases_unique_supplier_invoice_number_idx
  on public.purchases(user_id, lower(btrim(supplier_invoice_number)))
  where supplier_invoice_number is not null and btrim(supplier_invoice_number) <> '';
exception
  when duplicate_table or duplicate_object then null;
  when unique_violation then
    raise notice 'Des doublons de numero de facture fournisseur existent deja. Corrigez-les avant de rejouer cette contrainte.';
end $$;
