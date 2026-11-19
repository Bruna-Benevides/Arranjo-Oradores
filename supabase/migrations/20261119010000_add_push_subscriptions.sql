create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_user_endpoint_unique unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_acesso_proprio on public.push_subscriptions;
create policy push_subscriptions_acesso_proprio
  on public.push_subscriptions for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.usuarios_autorizados ua
      where ua.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.usuarios_autorizados ua
      where ua.user_id = (select auth.uid())
    )
  );

revoke all on public.push_subscriptions from public, anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);
