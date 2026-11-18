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
