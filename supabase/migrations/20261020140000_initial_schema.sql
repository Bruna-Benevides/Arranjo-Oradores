-- Schema inicial do Arranjo de Discursos.
-- Execute apenas em um projeto vazio. Para um banco existente, use a migration.

create extension if not exists pgcrypto;

create type public.tipo_programacao as enum ('vem', 'vai');

create or replace function public.atualizar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.congregacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text,
  dia_reuniao text,
  horario text,
  google_maps_url text,
  observacoes text,
  is_local boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index congregacoes_um_local
  on public.congregacoes ((is_local))
  where is_local;

comment on column public.congregacoes.is_local is
  'Identifica a congregação do responsável pelo arranjo. O índice parcial permite no máximo uma congregação local.';

create table public.irmaos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  congregacao_id uuid not null references public.congregacoes(id) on delete restrict,
  privilegio text,
  telefone text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint irmaos_privilegio_check
    check (privilegio is null or privilegio in ('anciao', 'servo_ministerial'))
);

create table public.discursos (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique,
  tema text not null,
  bloqueado boolean not null default false,
  motivo_bloqueio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discursos_bloqueio_check
    check (not bloqueado or nullif(btrim(motivo_bloqueio), '') is not null)
);

create table public.canticos (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique,
  tema text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.programacoes (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  tipo public.tipo_programacao not null,
  discurso_id uuid references public.discursos(id) on delete restrict,
  orador_id uuid references public.irmaos(id) on delete restrict,
  -- Nome e telefone também aceitam entrada manual, como no formulário.
  orador_nome text,
  orador_telefone text,
  -- `vem`: congregação de ORIGEM do irmão visitante.
  -- `vai`: congregação de DESTINO do irmão local.
  congregacao_id uuid references public.congregacoes(id) on delete restrict,
  evento_especial boolean not null default false,
  descricao_evento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programacoes_evento_check check (
    (
      evento_especial
      and nullif(btrim(coalesce(descricao_evento, '')), '') is not null
      and discurso_id is null
      and orador_id is null
      and nullif(btrim(coalesce(orador_nome, '')), '') is null
      and orador_telefone is null
    )
    or
    (
      not evento_especial
      and discurso_id is not null
      and nullif(btrim(coalesce(orador_nome, '')), '') is not null
      and nullif(btrim(coalesce(descricao_evento, '')), '') is null
      and congregacao_id is not null
    )
  )
);

comment on table public.programacoes is
  'Arranjos de oradores visitantes (vem) e oradores locais em outras congregações (vai).';
comment on column public.programacoes.congregacao_id is
  'Em tipo vem, congregação de ORIGEM do orador; em tipo vai, congregação de DESTINO. Eventos especiais podem deixar este vínculo vazio.';
comment on column public.programacoes.tipo is
  'vem = orador de outra congregação discursa aqui; vai = orador local discursa em outra congregação.';

create or replace function public.validar_vinculos_programacao()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  congregacao_local uuid;
  congregacao_orador uuid;
begin
  if new.evento_especial then
    return new;
  end if;

  select id into congregacao_local
  from public.congregacoes
  where is_local = true;

  if congregacao_local is null then
    raise exception 'Cadastre e marque a congregação local antes de salvar arranjos.';
  end if;

  if new.congregacao_id = congregacao_local then
    raise exception 'Selecione uma congregação diferente da local para este arranjo.';
  end if;

  if new.orador_id is null then
    return new;
  end if;

  select congregacao_id into congregacao_orador
  from public.irmaos
  where id = new.orador_id;

  if new.tipo = 'vem' then
    if congregacao_orador = congregacao_local then
      raise exception 'Em "Quem vem", o orador deve pertencer a outra congregação.';
    end if;
    if new.congregacao_id is distinct from congregacao_orador then
      raise exception 'Em "Quem vem", a congregação de origem deve ser a do orador cadastrado.';
    end if;
  elsif congregacao_orador is distinct from congregacao_local then
    raise exception 'Em "Quem vai", o orador cadastrado deve pertencer à congregação local.';
  end if;

  return new;
end;
$$;

create trigger programacoes_validar_vinculos
before insert or update on public.programacoes
for each row execute function public.validar_vinculos_programacao();

create table public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  valor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.acesso_pin (
  id integer primary key default 1 check (id = 1),
  pin_hash text,
  pin_salt text,
  tentativas_falhas integer not null default 0,
  bloqueado_ate timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.acesso_pin is
  'Hash PBKDF2 do PIN de acesso; RLS habilitada sem políticas. Somente a Edge Function usa a chave de serviço.';

create index programacoes_data_idx on public.programacoes(data);
create index programacoes_tipo_idx on public.programacoes(tipo);
create index programacoes_congregacao_id_idx on public.programacoes(congregacao_id);
create index programacoes_discurso_id_idx on public.programacoes(discurso_id);
create index irmaos_congregacao_id_idx on public.irmaos(congregacao_id);

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'congregacoes',
    'irmaos',
    'discursos',
    'canticos',
    'programacoes',
    'configuracoes',
    'acesso_pin'
  ]
  loop
    execute format(
      'create trigger %I_atualizar_updated_at before update on public.%I for each row execute function public.atualizar_updated_at()',
      tabela,
      tabela
    );
  end loop;
end;
$$;

create view public.vw_discursos_ultimo_uso
with (security_invoker = true)
as
select discurso_id, max(data) as ultima_data, count(*)::integer as total_usos
from public.programacoes
where discurso_id is not null and not evento_especial
group by discurso_id;

create view public.vw_historico_discursos
with (security_invoker = true)
as
select
  p.id as programacao_id,
  p.discurso_id,
  p.data,
  p.tipo,
  p.orador_id,
  p.orador_nome,
  i.nome as irmao_cadastrado,
  p.congregacao_id,
  c.nome as congregacao_nome
from public.programacoes p
left join public.irmaos i on i.id = p.orador_id
left join public.congregacoes c on c.id = p.congregacao_id
where p.discurso_id is not null and not p.evento_especial;

alter table public.congregacoes enable row level security;
alter table public.irmaos enable row level security;
alter table public.discursos enable row level security;
alter table public.canticos enable row level security;
alter table public.programacoes enable row level security;
alter table public.configuracoes enable row level security;
alter table public.acesso_pin enable row level security;

-- TEMPORÁRIO — restringir quando houver autenticação.
create policy congregacoes_temporario_acesso_total
  on public.congregacoes for all to anon, authenticated using (true) with check (true);
-- TEMPORÁRIO — restringir quando houver autenticação.
create policy irmaos_temporario_acesso_total
  on public.irmaos for all to anon, authenticated using (true) with check (true);
-- TEMPORÁRIO — restringir quando houver autenticação.
create policy discursos_temporario_acesso_total
  on public.discursos for all to anon, authenticated using (true) with check (true);
-- TEMPORÁRIO — restringir quando houver autenticação.
create policy canticos_temporario_acesso_total
  on public.canticos for all to anon, authenticated using (true) with check (true);
-- TEMPORÁRIO — restringir quando houver autenticação.
create policy programacoes_temporario_acesso_total
  on public.programacoes for all to anon, authenticated using (true) with check (true);
-- TEMPORÁRIO — restringir quando houver autenticação.
create policy configuracoes_temporario_acesso_total
  on public.configuracoes for all to anon, authenticated using (true) with check (true);

grant select on public.vw_discursos_ultimo_uso to anon, authenticated;
grant select on public.vw_historico_discursos to anon, authenticated;
