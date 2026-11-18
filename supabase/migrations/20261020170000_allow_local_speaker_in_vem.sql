-- In "vem", the speaker may belong to the local congregation; the selected
-- congregation remains the speaker's congregation of origin.
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

  if new.tipo = 'vai' and new.congregacao_id = congregacao_local then
    raise exception 'Selecione uma congregação diferente da local para este arranjo.';
  end if;

  if new.orador_id is null then
    return new;
  end if;

  select congregacao_id into congregacao_orador
  from public.irmaos
  where id = new.orador_id;

  if new.tipo = 'vem' then
    if new.congregacao_id is distinct from congregacao_orador then
      raise exception 'Em "Quem vem", a congregação de origem deve ser a do orador cadastrado, podendo ser a congregação local.';
    end if;
  elsif congregacao_orador is distinct from congregacao_local then
    raise exception 'Em "Quem vai", o orador cadastrado deve pertencer à congregação local.';
  end if;

  return new;
end;
$$;
