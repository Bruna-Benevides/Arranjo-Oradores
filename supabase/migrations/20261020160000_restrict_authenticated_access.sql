-- Replaces the temporary anonymous access with a closed allowlist of Supabase users.
create table if not exists public.usuarios_autorizados (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.usuarios_autorizados is
  'Lista fechada de contas autorizadas a acessar os dados da aplicação.';

alter table public.usuarios_autorizados enable row level security;
drop policy if exists usuarios_autorizados_consultar_propria_conta
  on public.usuarios_autorizados;
create policy usuarios_autorizados_consultar_propria_conta
  on public.usuarios_autorizados for select to authenticated
  using (user_id = (select auth.uid()));

alter table public.congregacoes enable row level security;
drop policy if exists congregacoes_temporario_acesso_total on public.congregacoes;
drop policy if exists congregacoes_acesso_autorizado on public.congregacoes;
create policy congregacoes_acesso_autorizado
  on public.congregacoes for all to authenticated
  using (exists (
    select 1 from public.usuarios_autorizados ua
    where ua.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.usuarios_autorizados ua
    where ua.user_id = (select auth.uid())
  ));

alter table public.irmaos enable row level security;
drop policy if exists irmaos_temporario_acesso_total on public.irmaos;
drop policy if exists irmaos_acesso_autorizado on public.irmaos;
create policy irmaos_acesso_autorizado
  on public.irmaos for all to authenticated
  using (exists (
    select 1 from public.usuarios_autorizados ua
    where ua.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.usuarios_autorizados ua
    where ua.user_id = (select auth.uid())
  ));

alter table public.discursos enable row level security;
drop policy if exists discursos_temporario_acesso_total on public.discursos;
drop policy if exists discursos_acesso_autorizado on public.discursos;
create policy discursos_acesso_autorizado
  on public.discursos for all to authenticated
  using (exists (
    select 1 from public.usuarios_autorizados ua
    where ua.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.usuarios_autorizados ua
    where ua.user_id = (select auth.uid())
  ));

alter table public.canticos enable row level security;
drop policy if exists canticos_temporario_acesso_total on public.canticos;
drop policy if exists canticos_acesso_autorizado on public.canticos;
create policy canticos_acesso_autorizado
  on public.canticos for all to authenticated
  using (exists (
    select 1 from public.usuarios_autorizados ua
    where ua.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.usuarios_autorizados ua
    where ua.user_id = (select auth.uid())
  ));

alter table public.programacoes enable row level security;
drop policy if exists programacoes_temporario_acesso_total on public.programacoes;
drop policy if exists programacoes_acesso_autorizado on public.programacoes;
create policy programacoes_acesso_autorizado
  on public.programacoes for all to authenticated
  using (exists (
    select 1 from public.usuarios_autorizados ua
    where ua.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.usuarios_autorizados ua
    where ua.user_id = (select auth.uid())
  ));

alter table public.configuracoes enable row level security;
drop policy if exists configuracoes_temporario_acesso_total on public.configuracoes;
drop policy if exists configuracoes_acesso_autorizado on public.configuracoes;
create policy configuracoes_acesso_autorizado
  on public.configuracoes for all to authenticated
  using (exists (
    select 1 from public.usuarios_autorizados ua
    where ua.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.usuarios_autorizados ua
    where ua.user_id = (select auth.uid())
  ));

revoke all on public.congregacoes, public.irmaos, public.discursos, public.canticos,
  public.programacoes, public.configuracoes, public.usuarios_autorizados
  from public, anon;
revoke all on public.usuarios_autorizados from authenticated;

grant select, insert, update, delete on public.congregacoes, public.irmaos,
  public.discursos, public.canticos, public.programacoes, public.configuracoes
  to authenticated;
grant select on public.usuarios_autorizados to authenticated;
revoke all on public.vw_discursos_ultimo_uso, public.vw_historico_discursos
  from public, anon;
grant select on public.vw_discursos_ultimo_uso, public.vw_historico_discursos
  to authenticated;

-- The app no longer uses the old PIN. This table only held its verifier and retry state.
drop table if exists public.acesso_pin;
