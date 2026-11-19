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
  discurso_numero_historico integer,
  discurso_tema_historico text,
  orador_id uuid references public.irmaos(id) on delete restrict,
  -- Nome e telefone também aceitam entrada manual, como no formulário.
  orador_nome text,
  orador_telefone text,
  -- `vem`: congregação de ORIGEM do irmão visitante.
  -- `vai`: congregação de DESTINO do irmão local.
  congregacao_id uuid references public.congregacoes(id) on delete restrict,
  congregacao_nome_historico text,
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
      and (
        discurso_id is not null
        or (discurso_numero_historico is not null and nullif(btrim(discurso_tema_historico), '') is not null)
      )
      and nullif(btrim(coalesce(orador_nome, '')), '') is not null
      and nullif(btrim(coalesce(descricao_evento, '')), '') is null
      and (congregacao_id is not null or nullif(btrim(congregacao_nome_historico), '') is not null)
    )
  )
);

comment on table public.programacoes is
  'Arranjos de oradores que vêm (vem, inclusive da congregação local) e oradores locais que vão a outras congregações (vai).';
comment on column public.programacoes.congregacao_id is
  'Em tipo vem, congregação de ORIGEM do orador (pode ser a local); em tipo vai, congregação de DESTINO (não pode ser a local), independentemente da congregação do orador. Eventos especiais podem deixar este vínculo vazio.';
comment on column public.programacoes.tipo is
  'vem = orador discursa na congregação local, podendo ser da própria congregação local ou de outra; vai = irmão de qualquer congregação discursa em outra congregação.';

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

  if new.data < (now() at time zone 'America/Sao_Paulo')::date and (
    (new.discurso_id is null and new.discurso_tema_historico is not null)
    or (new.congregacao_id is null and new.congregacao_nome_historico is not null)
  ) then
    return new;
  end if;

  select id into congregacao_local
  from public.congregacoes
  where is_local = true;

  if congregacao_local is null then
    raise exception 'Cadastre e marque a congregação local antes de salvar arranjos.';
  end if;

  if new.tipo = 'vai' and new.congregacao_id = congregacao_local then
    raise exception 'Selecione uma congregação diferente da local para este arranjo.';
  end if;

  if new.orador_id is null then
    return new;
  end if;

  select congregacao_id into congregacao_orador
  from public.irmaos
  where id = new.orador_id;

  if new.tipo = 'vem' and new.congregacao_id is distinct from congregacao_orador then
    raise exception 'Em "Quem vem", a congregação de origem deve ser a do orador cadastrado, podendo ser a congregação local.';
  end if;

  return new;
end;
$$;

create trigger programacoes_validar_vinculos
before insert or update on public.programacoes
for each row execute function public.validar_vinculos_programacao();

create or replace function public.preservar_historico_ao_excluir_discurso()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.programacoes
    where discurso_id = old.id and data >= (now() at time zone 'America/Sao_Paulo')::date
  ) then
    raise exception 'Este discurso está vinculado a arranjos de hoje ou futuros. Altere esses arranjos antes de excluir.';
  end if;

  update public.programacoes
  set
    discurso_numero_historico = old.numero,
    discurso_tema_historico = old.tema,
    discurso_id = null
  where discurso_id = old.id and data < (now() at time zone 'America/Sao_Paulo')::date;

  return old;
end;
$$;

create trigger discursos_preservar_historico_ao_excluir
before delete on public.discursos
for each row execute function public.preservar_historico_ao_excluir_discurso();

create or replace function public.preservar_historico_ao_excluir_congregacao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_local then
    raise exception 'A congregação local não pode ser excluída. Defina outra congregação como local primeiro.';
  end if;

  if exists (
    select 1 from public.irmaos where congregacao_id = old.id
  ) then
    raise exception 'Esta congregação ainda está vinculada a irmãos. Altere a congregação desses irmãos antes de excluir.';
  end if;

  if exists (
    select 1 from public.programacoes
    where congregacao_id = old.id and data >= (now() at time zone 'America/Sao_Paulo')::date
  ) then
    raise exception 'Esta congregação está vinculada a arranjos de hoje ou futuros. Altere esses arranjos antes de excluir.';
  end if;

  update public.programacoes
  set
    congregacao_nome_historico = old.nome,
    congregacao_id = null
  where congregacao_id = old.id and data < (now() at time zone 'America/Sao_Paulo')::date;

  return old;
end;
$$;

create trigger congregacoes_preservar_historico_ao_excluir
before delete on public.congregacoes
for each row execute function public.preservar_historico_ao_excluir_congregacao();

create table public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  valor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_user_endpoint_unique unique (user_id, endpoint)
);

create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

create table public.usuarios_autorizados (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.usuarios_autorizados is
  'Lista fechada de contas autorizadas a acessar os dados da aplicação.';

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
    'configuracoes'
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

create or replace function public.restaurar_backup_aplicativo(backup_payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.usuarios_autorizados
    where user_id = auth.uid()
  ) then
    raise exception 'Usuário não autorizado a restaurar dados.';
  end if;

  if jsonb_typeof(backup_payload) is distinct from 'object'
    or backup_payload ->> 'format' is distinct from 'arranjo-discursos-backup'
    or backup_payload ->> 'version' is distinct from '1'
    or jsonb_typeof(backup_payload -> 'data') is distinct from 'object'
  then
    raise exception 'Formato de backup inválido ou incompatível.';
  end if;

  if jsonb_typeof(backup_payload #> '{data,congregacoes}') is distinct from 'array'
    or jsonb_typeof(backup_payload #> '{data,irmaos}') is distinct from 'array'
    or jsonb_typeof(backup_payload #> '{data,discursos}') is distinct from 'array'
    or jsonb_typeof(backup_payload #> '{data,canticos}') is distinct from 'array'
    or jsonb_typeof(backup_payload #> '{data,programacoes}') is distinct from 'array'
    or jsonb_typeof(backup_payload #> '{data,configuracoes}') is distinct from 'array'
  then
    raise exception 'O backup não contém todas as listas de dados necessárias.';
  end if;

  update public.congregacoes as atual
  set
    nome = coalesce(nullif(btrim(atual.nome), ''), origem.nome),
    endereco = coalesce(nullif(btrim(atual.endereco), ''), origem.endereco),
    dia_reuniao = coalesce(nullif(btrim(atual.dia_reuniao), ''), origem.dia_reuniao),
    horario = coalesce(nullif(btrim(atual.horario), ''), origem.horario),
    google_maps_url = coalesce(nullif(btrim(atual.google_maps_url), ''), origem.google_maps_url),
    observacoes = coalesce(nullif(btrim(atual.observacoes), ''), origem.observacoes)
  from jsonb_populate_recordset(null::public.congregacoes, backup_payload #> '{data,congregacoes}') as origem
  where (atual.id = origem.id or (origem.is_local and atual.is_local))
    and (
      (nullif(btrim(atual.nome), '') is null and nullif(btrim(origem.nome), '') is not null)
      or (nullif(btrim(atual.endereco), '') is null and nullif(btrim(origem.endereco), '') is not null)
      or (nullif(btrim(atual.dia_reuniao), '') is null and nullif(btrim(origem.dia_reuniao), '') is not null)
      or (nullif(btrim(atual.horario), '') is null and nullif(btrim(origem.horario), '') is not null)
      or (nullif(btrim(atual.google_maps_url), '') is null and nullif(btrim(origem.google_maps_url), '') is not null)
      or (nullif(btrim(atual.observacoes), '') is null and nullif(btrim(origem.observacoes), '') is not null)
    );

  insert into public.congregacoes
  select origem.*
  from jsonb_populate_recordset(null::public.congregacoes, backup_payload #> '{data,congregacoes}') as origem
  where not exists (
    select 1 from public.congregacoes as atual
    where atual.id = origem.id or (origem.is_local and atual.is_local)
  );

  update public.discursos as atual
  set
    tema = coalesce(nullif(btrim(atual.tema), ''), origem.tema),
    motivo_bloqueio = coalesce(nullif(btrim(atual.motivo_bloqueio), ''), origem.motivo_bloqueio)
  from jsonb_populate_recordset(null::public.discursos, backup_payload #> '{data,discursos}') as origem
  where (atual.id = origem.id or atual.numero = origem.numero)
    and (
      (nullif(btrim(atual.tema), '') is null and nullif(btrim(origem.tema), '') is not null)
      or (nullif(btrim(atual.motivo_bloqueio), '') is null and nullif(btrim(origem.motivo_bloqueio), '') is not null)
    );

  insert into public.discursos
  select origem.*
  from jsonb_populate_recordset(null::public.discursos, backup_payload #> '{data,discursos}') as origem
  where not exists (
    select 1 from public.discursos as atual
    where atual.id = origem.id or atual.numero = origem.numero
  );

  update public.canticos as atual
  set tema = coalesce(nullif(btrim(atual.tema), ''), origem.tema)
  from jsonb_populate_recordset(null::public.canticos, backup_payload #> '{data,canticos}') as origem
  where (atual.id = origem.id or atual.numero = origem.numero)
    and nullif(btrim(atual.tema), '') is null
    and nullif(btrim(origem.tema), '') is not null;

  insert into public.canticos
  select origem.*
  from jsonb_populate_recordset(null::public.canticos, backup_payload #> '{data,canticos}') as origem
  where not exists (
    select 1 from public.canticos as atual
    where atual.id = origem.id or atual.numero = origem.numero
  );

  update public.irmaos as atual
  set
    nome = coalesce(nullif(btrim(atual.nome), ''), origem.nome),
    telefone = coalesce(nullif(btrim(atual.telefone), ''), origem.telefone),
    privilegio = coalesce(nullif(btrim(atual.privilegio), ''), origem.privilegio),
    observacoes = coalesce(nullif(btrim(atual.observacoes), ''), origem.observacoes)
  from jsonb_populate_recordset(null::public.irmaos, backup_payload #> '{data,irmaos}') as origem
  where atual.id = origem.id
    and (
      (nullif(btrim(atual.nome), '') is null and nullif(btrim(origem.nome), '') is not null)
      or (nullif(btrim(atual.telefone), '') is null and nullif(btrim(origem.telefone), '') is not null)
      or (nullif(btrim(atual.privilegio), '') is null and nullif(btrim(origem.privilegio), '') is not null)
      or (nullif(btrim(atual.observacoes), '') is null and nullif(btrim(origem.observacoes), '') is not null)
    );

  insert into public.irmaos
  select
    origem.id,
    origem.nome,
    congregacao_atual.id,
    origem.privilegio,
    origem.telefone,
    origem.observacoes,
    origem.created_at,
    origem.updated_at
  from jsonb_populate_recordset(null::public.irmaos, backup_payload #> '{data,irmaos}') as origem
  join jsonb_populate_recordset(null::public.congregacoes, backup_payload #> '{data,congregacoes}') as congregacao_backup
    on congregacao_backup.id = origem.congregacao_id
  join public.congregacoes as congregacao_atual
    on congregacao_atual.id = congregacao_backup.id
    or (congregacao_backup.is_local and congregacao_atual.is_local)
  where not exists (select 1 from public.irmaos as atual where atual.id = origem.id);

  update public.programacoes as atual
  set
    discurso_id = case when atual.evento_especial then atual.discurso_id else coalesce(atual.discurso_id, discurso_atual.id) end,
    orador_id = case when atual.evento_especial then atual.orador_id else coalesce(atual.orador_id, origem.orador_id) end,
    orador_nome = case when atual.evento_especial then atual.orador_nome else coalesce(nullif(btrim(atual.orador_nome), ''), origem.orador_nome) end,
    orador_telefone = case when atual.evento_especial then atual.orador_telefone else coalesce(nullif(btrim(atual.orador_telefone), ''), origem.orador_telefone) end,
    congregacao_id = case when atual.evento_especial then atual.congregacao_id else coalesce(atual.congregacao_id, congregacao_atual.id) end,
    descricao_evento = case when atual.evento_especial then coalesce(nullif(btrim(atual.descricao_evento), ''), origem.descricao_evento) else atual.descricao_evento end
  from jsonb_populate_recordset(null::public.programacoes, backup_payload #> '{data,programacoes}') as origem
  left join jsonb_populate_recordset(null::public.discursos, backup_payload #> '{data,discursos}') as discurso_backup
    on discurso_backup.id = origem.discurso_id
  left join public.discursos as discurso_atual
    on discurso_atual.numero = discurso_backup.numero
  left join jsonb_populate_recordset(null::public.congregacoes, backup_payload #> '{data,congregacoes}') as congregacao_backup
    on congregacao_backup.id = origem.congregacao_id
  left join public.congregacoes as congregacao_atual
    on congregacao_atual.id = congregacao_backup.id
    or (congregacao_backup.is_local and congregacao_atual.is_local)
  where atual.id = origem.id
    and (
      (
        not atual.evento_especial
        and (
          (atual.discurso_id is null and discurso_atual.id is not null)
          or (atual.orador_id is null and origem.orador_id is not null)
          or (nullif(btrim(atual.orador_nome), '') is null and nullif(btrim(origem.orador_nome), '') is not null)
          or (nullif(btrim(atual.orador_telefone), '') is null and nullif(btrim(origem.orador_telefone), '') is not null)
          or (atual.congregacao_id is null and congregacao_atual.id is not null)
        )
      )
      or (
        atual.evento_especial
        and nullif(btrim(atual.descricao_evento), '') is null
        and nullif(btrim(origem.descricao_evento), '') is not null
      )
    );

  insert into public.programacoes
  select
    origem.id,
    origem.data,
    origem.tipo,
    discurso_atual.id,
    origem.orador_id,
    origem.orador_nome,
    origem.orador_telefone,
    congregacao_atual.id,
    origem.evento_especial,
    origem.descricao_evento,
    origem.created_at,
    origem.updated_at
  from jsonb_populate_recordset(null::public.programacoes, backup_payload #> '{data,programacoes}') as origem
  left join jsonb_populate_recordset(null::public.discursos, backup_payload #> '{data,discursos}') as discurso_backup
    on discurso_backup.id = origem.discurso_id
  left join public.discursos as discurso_atual
    on discurso_atual.numero = discurso_backup.numero
  left join jsonb_populate_recordset(null::public.congregacoes, backup_payload #> '{data,congregacoes}') as congregacao_backup
    on congregacao_backup.id = origem.congregacao_id
  left join public.congregacoes as congregacao_atual
    on congregacao_atual.id = congregacao_backup.id
    or (congregacao_backup.is_local and congregacao_atual.is_local)
  where not exists (select 1 from public.programacoes as atual where atual.id = origem.id);

  update public.configuracoes as atual
  set valor = coalesce(nullif(btrim(atual.valor), ''), origem.valor)
  from jsonb_populate_recordset(null::public.configuracoes, backup_payload #> '{data,configuracoes}') as origem
  where (atual.id = origem.id or atual.chave = origem.chave)
    and nullif(btrim(atual.valor), '') is null
    and nullif(btrim(origem.valor), '') is not null;

  insert into public.configuracoes
  select origem.*
  from jsonb_populate_recordset(null::public.configuracoes, backup_payload #> '{data,configuracoes}') as origem
  where not exists (
    select 1 from public.configuracoes as atual
    where atual.id = origem.id or atual.chave = origem.chave
  );
end;
$$;

revoke all on function public.restaurar_backup_aplicativo(jsonb) from public, anon;
grant execute on function public.restaurar_backup_aplicativo(jsonb) to authenticated;
revoke all on function public.preservar_historico_ao_excluir_discurso() from public, anon, authenticated;
revoke all on function public.preservar_historico_ao_excluir_congregacao() from public, anon, authenticated;

alter table public.congregacoes enable row level security;
alter table public.irmaos enable row level security;
alter table public.discursos enable row level security;
alter table public.canticos enable row level security;
alter table public.programacoes enable row level security;
alter table public.configuracoes enable row level security;
alter table public.usuarios_autorizados enable row level security;
alter table public.push_subscriptions enable row level security;

create policy usuarios_autorizados_consultar_propria_conta
  on public.usuarios_autorizados for select to authenticated
  using (user_id = (select auth.uid()));

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

create policy push_subscriptions_acesso_proprio
  on public.push_subscriptions for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.usuarios_autorizados ua
      where ua.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.usuarios_autorizados ua
      where ua.user_id = (select auth.uid())
    )
  );

revoke all on public.congregacoes, public.irmaos, public.discursos, public.canticos,
  public.programacoes, public.configuracoes, public.usuarios_autorizados,
  public.push_subscriptions
  from public, anon;
revoke all on public.usuarios_autorizados from authenticated;

grant select, insert, update, delete on public.congregacoes, public.irmaos,
  public.discursos, public.canticos, public.programacoes, public.configuracoes,
  public.push_subscriptions
  to authenticated;
grant select on public.usuarios_autorizados to authenticated;
revoke all on public.vw_discursos_ultimo_uso, public.vw_historico_discursos
  from public, anon;
grant select on public.vw_discursos_ultimo_uso, public.vw_historico_discursos
  to authenticated;
