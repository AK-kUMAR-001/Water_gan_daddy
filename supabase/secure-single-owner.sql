-- Create an account in the app first, then replace the UUID below with its
-- user ID from Supabase Dashboard > Authentication > Users before running.
alter table public.customers
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.transactions
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.expenses
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

do $$
declare
  account_owner uuid := 'REPLACE_WITH_AUTH_USER_UUID';
  relation record;
begin
  update public.customers set owner_id = account_owner where owner_id is null;
  update public.transactions set owner_id = account_owner where owner_id is null;
  update public.expenses set owner_id = account_owner where owner_id is null;

  for relation in
    select conname
    from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and confrelid = 'public.customers'::regclass
      and contype = 'f'
  loop
    execute format('alter table public.transactions drop constraint %I', relation.conname);
  end loop;
end $$;

alter table public.customers alter column owner_id set not null;
alter table public.transactions alter column owner_id set not null;
alter table public.expenses alter column owner_id set not null;

create unique index if not exists customers_id_owner_id_unique
  on public.customers (id, owner_id);

alter table public.transactions
  add constraint transactions_customer_owner_fkey
  foreign key ("customerId", owner_id)
  references public.customers (id, owner_id)
  on delete cascade;

do $$
declare
  policy record;
begin
  for policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('customers', 'transactions', 'expenses')
  loop
    execute format('drop policy %I on public.%I', policy.policyname, policy.tablename);
  end loop;
end $$;

alter table public.customers enable row level security;
alter table public.transactions enable row level security;
alter table public.expenses enable row level security;

create policy "owner can access customers"
  on public.customers for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owner can access transactions"
  on public.transactions for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owner can access expenses"
  on public.expenses for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);