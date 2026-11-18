alter table public.programacoes
  add column if not exists discurso_numero_historico integer,
  add column if not exists discurso_tema_historico text,
  add column if not exists congregacao_nome_historico text;

alter table public.programacoes
  drop constraint if exists programacoes_evento_check;

alter table public.programacoes
  add constraint programacoes_evento_check check (
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
        or (
          discurso_numero_historico is not null
          and nullif(btrim(discurso_tema_historico), '') is not null
        )
      )
      and nullif(btrim(coalesce(orador_nome, '')), '') is not null
      and nullif(btrim(coalesce(descricao_evento, '')), '') is null
      and (
        congregacao_id is not null
        or nullif(btrim(congregacao_nome_historico), '') is not null
      )
    )
  );

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

drop trigger if exists discursos_preservar_historico_ao_excluir on public.discursos;
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

drop trigger if exists congregacoes_preservar_historico_ao_excluir on public.congregacoes;
create trigger congregacoes_preservar_historico_ao_excluir
before delete on public.congregacoes
for each row execute function public.preservar_historico_ao_excluir_congregacao();

revoke all on function public.preservar_historico_ao_excluir_discurso() from public, anon, authenticated;
revoke all on function public.preservar_historico_ao_excluir_congregacao() from public, anon, authenticated;

notify pgrst, 'reload schema';
