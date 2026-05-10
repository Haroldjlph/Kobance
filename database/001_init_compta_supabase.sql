create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null,
  siret text not null,
  vat_number text,
  address text,
  phone text,
  logo_data_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  siret text,
  vat_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  siret text,
  vat_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text,
  name text not null,
  description text,
  unit_price_ht numeric(12, 2) not null,
  vat_rate numeric(4, 2) not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  prefix text not null,
  year integer not null,
  next_value integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, prefix, year)
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  member_email text not null,
  member_user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'ACCOUNTING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, member_email)
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_date date not null,
  label text not null,
  transaction_type text not null default 'EXPENSE',
  amount numeric(12, 2) not null,
  reference text,
  notes text,
  reconciled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_company_member(company_owner_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() = company_owner_id
    or exists (
      select 1
      from public.company_members
      where owner_user_id = company_owner_id
        and (
          member_user_id = auth.uid()
          or lower(member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    );
$$;

do $$
begin
  create type public.invoice_status as enum ('PAID', 'UNPAID');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_status as enum ('DRAFT', 'ISSUED', 'PAID', 'CANCELED');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  invoice_number text not null,
  invoice_date date not null,
  due_date date,
  status public.document_status not null default 'DRAFT',
  total_ht numeric(12, 2) not null default 0,
  total_vat numeric(12, 2) not null default 0,
  total_ttc numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid references public.articles(id) on delete set null,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit_price_ht numeric(12, 2) not null,
  discount_type text not null default 'NONE',
  discount_value numeric(12, 2) not null default 0,
  vat_rate numeric(4, 2) not null default 20,
  line_ht numeric(12, 2) not null,
  line_vat numeric(12, 2) not null,
  line_ttc numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  credit_note_number text not null,
  credit_note_date date not null,
  reason text not null,
  total_ht numeric(12, 2) not null,
  total_vat numeric(12, 2) not null,
  total_ttc numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, credit_note_number)
);

create table if not exists public.credit_note_lines (
  id uuid primary key default gen_random_uuid(),
  credit_note_id uuid not null references public.credit_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_line_id uuid references public.invoice_lines(id) on delete set null,
  description text not null,
  vat_rate numeric(4, 2) not null default 20,
  line_ht numeric(12, 2) not null,
  line_vat numeric(12, 2) not null,
  line_ttc numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  quote_number text not null,
  quote_date date not null,
  valid_until date,
  status public.document_status not null default 'DRAFT',
  total_ht numeric(12, 2) not null default 0,
  total_vat numeric(12, 2) not null default 0,
  total_ttc numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, quote_number)
);

create table if not exists public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid references public.articles(id) on delete set null,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit_price_ht numeric(12, 2) not null,
  discount_type text not null default 'NONE',
  discount_value numeric(12, 2) not null default 0,
  vat_rate numeric(4, 2) not null default 20,
  line_ht numeric(12, 2) not null,
  line_vat numeric(12, 2) not null,
  line_ttc numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  party_id uuid not null references public.clients(id) on delete restrict,
  article_id uuid references public.articles(id) on delete set null,
  invoice_date date not null,
  description text not null,
  amount_ht numeric(12, 2) not null,
  vat_rate numeric(4, 2) not null,
  vat_amount numeric(12, 2) not null,
  amount_ttc numeric(12, 2) not null,
  discount_type text not null default 'NONE',
  discount_value numeric(12, 2) not null default 0,
  status public.invoice_status not null default 'UNPAID',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  party_id uuid not null references public.suppliers(id) on delete restrict,
  invoice_date date not null,
  description text not null,
  amount_ht numeric(12, 2) not null,
  vat_rate numeric(4, 2) not null,
  vat_amount numeric(12, 2) not null,
  amount_ttc numeric(12, 2) not null,
  status public.invoice_status not null default 'UNPAID',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.next_document_number(document_prefix text, company_user_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_user_id uuid := coalesce(company_user_id, auth.uid());
  current_year integer := extract(year from now())::integer;
  current_number integer;
  initial_next_value integer;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non authentifie';
  end if;

  if document_prefix not in ('FAC', 'DEV', 'AV') then
    raise exception 'Prefixe de document invalide';
  end if;

  if not public.is_company_member(target_user_id) then
    raise exception 'Acces refuse a cette entreprise';
  end if;

  select coalesce(max(match_number), 0) + 2
  into initial_next_value
  from (
    select substring(invoice_number from ('^' || document_prefix || '-' || current_year || '-([0-9]+)$'))::integer as match_number
    from public.invoices
    where user_id = target_user_id and document_prefix = 'FAC'
    union all
    select substring(quote_number from ('^' || document_prefix || '-' || current_year || '-([0-9]+)$'))::integer as match_number
    from public.quotes
    where user_id = target_user_id and document_prefix = 'DEV'
    union all
    select substring(credit_note_number from ('^' || document_prefix || '-' || current_year || '-([0-9]+)$'))::integer as match_number
    from public.credit_notes
    where user_id = target_user_id and document_prefix = 'AV'
  ) existing_numbers
  where match_number is not null;

  insert into public.document_counters (user_id, prefix, year, next_value)
  values (target_user_id, document_prefix, current_year, initial_next_value)
  on conflict (user_id, prefix, year)
  do update set
    next_value = public.document_counters.next_value + 1,
    updated_at = now()
  returning public.document_counters.next_value - 1 into current_number;

  return document_prefix || '-' || current_year || '-' || lpad(current_number::text, 4, '0');
end;
$$;

grant execute on function public.next_document_number(text, uuid) to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;

alter table public.sales add column if not exists article_id uuid references public.articles(id) on delete set null;
alter table public.sales add column if not exists discount_type text not null default 'NONE';
alter table public.sales add column if not exists discount_value numeric(12, 2) not null default 0;
alter table public.profiles add column if not exists logo_data_url text;
alter table public.bank_transactions add column if not exists linked_invoice_id uuid references public.invoices(id) on delete set null;
alter table public.bank_transactions add column if not exists linked_purchase_id uuid references public.purchases(id) on delete set null;

create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists clients_user_id_name_idx on public.clients(user_id, name);
create index if not exists suppliers_user_id_idx on public.suppliers(user_id);
create index if not exists suppliers_user_id_name_idx on public.suppliers(user_id, name);
create index if not exists articles_user_id_idx on public.articles(user_id);
create index if not exists articles_user_id_name_idx on public.articles(user_id, name);
create index if not exists company_members_owner_user_id_idx on public.company_members(owner_user_id);
create index if not exists company_members_member_user_id_idx on public.company_members(member_user_id);
create index if not exists company_members_member_email_idx on public.company_members(member_email);
create index if not exists bank_transactions_user_id_idx on public.bank_transactions(user_id);
create index if not exists bank_transactions_user_id_date_idx on public.bank_transactions(user_id, transaction_date);
create index if not exists bank_transactions_linked_invoice_id_idx on public.bank_transactions(linked_invoice_id);
create index if not exists bank_transactions_linked_purchase_id_idx on public.bank_transactions(linked_purchase_id);
create index if not exists document_counters_user_id_idx on public.document_counters(user_id);
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_user_id_invoice_date_idx on public.invoices(user_id, invoice_date);
create index if not exists invoice_lines_invoice_id_idx on public.invoice_lines(invoice_id);
create index if not exists invoice_lines_user_id_idx on public.invoice_lines(user_id);
create index if not exists credit_notes_user_id_idx on public.credit_notes(user_id);
create index if not exists credit_notes_user_id_date_idx on public.credit_notes(user_id, credit_note_date);
create index if not exists credit_note_lines_credit_note_id_idx on public.credit_note_lines(credit_note_id);
create index if not exists credit_note_lines_user_id_idx on public.credit_note_lines(user_id);
create index if not exists quotes_user_id_idx on public.quotes(user_id);
create index if not exists quotes_user_id_quote_date_idx on public.quotes(user_id, quote_date);
create index if not exists quote_lines_quote_id_idx on public.quote_lines(quote_id);
create index if not exists quote_lines_user_id_idx on public.quote_lines(user_id);
create index if not exists sales_user_id_idx on public.sales(user_id);
create index if not exists sales_user_id_invoice_date_idx on public.sales(user_id, invoice_date);
create index if not exists purchases_user_id_idx on public.purchases(user_id);
create index if not exists purchases_user_id_invoice_date_idx on public.purchases(user_id, invoice_date);

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.suppliers enable row level security;
alter table public.articles enable row level security;
alter table public.company_members enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.document_counters enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.credit_notes enable row level security;
alter table public.credit_note_lines enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.sales enable row level security;
alter table public.purchases enable row level security;

drop policy if exists "Users can manage their profile" on public.profiles;
drop policy if exists "Users can manage their clients" on public.clients;
drop policy if exists "Users can manage their suppliers" on public.suppliers;
drop policy if exists "Users can manage their articles" on public.articles;
drop policy if exists "Users can manage their company members" on public.company_members;
drop policy if exists "Users can manage their bank transactions" on public.bank_transactions;
drop policy if exists "Users can manage their document counters" on public.document_counters;
drop policy if exists "Users can manage their invoices" on public.invoices;
drop policy if exists "Users can manage their invoice lines" on public.invoice_lines;
drop policy if exists "Users can manage their credit notes" on public.credit_notes;
drop policy if exists "Users can manage their credit note lines" on public.credit_note_lines;
drop policy if exists "Users can manage their quotes" on public.quotes;
drop policy if exists "Users can manage their quote lines" on public.quote_lines;
drop policy if exists "Users can manage their sales" on public.sales;
drop policy if exists "Users can manage their purchases" on public.purchases;

create policy "Users can manage their profile"
on public.profiles
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their clients"
on public.clients
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their suppliers"
on public.suppliers
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their articles"
on public.articles
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their company members"
on public.company_members
for all
to authenticated
using (public.is_company_member(owner_user_id))
with check (auth.uid() = owner_user_id);

create policy "Users can manage their bank transactions"
on public.bank_transactions
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their document counters"
on public.document_counters
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their invoices"
on public.invoices
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their invoice lines"
on public.invoice_lines
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their credit notes"
on public.credit_notes
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their credit note lines"
on public.credit_note_lines
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their quotes"
on public.quotes
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their quote lines"
on public.quote_lines
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their sales"
on public.sales
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));

create policy "Users can manage their purchases"
on public.purchases
for all
to authenticated
using (public.is_company_member(user_id))
with check (public.is_company_member(user_id));
