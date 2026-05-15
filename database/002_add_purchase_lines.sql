create table if not exists public.purchase_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount_ht numeric(12, 2) not null,
  vat_rate numeric(4, 2) not null default 20,
  vat_amount numeric(12, 2) not null,
  amount_ttc numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchase_lines_purchase_id_idx on public.purchase_lines(purchase_id);
create index if not exists purchase_lines_user_id_idx on public.purchase_lines(user_id);

alter table public.purchase_lines enable row level security;

drop policy if exists "Users can manage their purchase lines" on public.purchase_lines;
create policy "Users can manage their purchase lines"
on public.purchase_lines
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));
