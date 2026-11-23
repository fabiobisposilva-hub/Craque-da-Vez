-- Craque da Vez: novidades (família só para ver, fotos, escudos, resumo, editar e excluir jogos).
-- Rode tudo de uma vez no SQL Editor do Supabase. Pode rodar mais de uma vez.

-- Craque da Vez: família só para ver, fotos e escudos, resumo do jogo, editar e excluir jogos.
-- Pode rodar mais de uma vez.

-- =====================================================================
-- 1. Família convidada só para ver (papel 'leitor')
-- =====================================================================

alter table public.jogador_responsaveis drop constraint if exists jogador_responsaveis_papel_check;
alter table public.jogador_responsaveis add constraint jogador_responsaveis_papel_check
  check (papel in ('titular', 'responsavel', 'leitor'));

alter table public.convites_responsavel add column if not exists papel text not null default 'responsavel';
alter table public.convites_responsavel drop constraint if exists convites_responsavel_papel_check;
alter table public.convites_responsavel add constraint convites_responsavel_papel_check
  check (papel in ('responsavel', 'leitor'));

-- Quem pode EDITAR o jogador (titular ou responsável)
create or replace function public.eh_responsavel(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from jogador_responsaveis
                 where jogador_id = j and usuario_id = auth.uid() and status = 'ativo'
                   and papel in ('titular', 'responsavel'))
$$;

-- Quem pode VER o jogador (inclui a família convidada só para ver)
create or replace function public.eh_membro(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from jogador_responsaveis
                 where jogador_id = j and usuario_id = auth.uid() and status = 'ativo')
$$;

create or replace function public.eh_membro_do_time(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from jogador_times jt
    join jogador_responsaveis r on r.jogador_id = jt.jogador_id
    where jt.time_id = t and jt.status = 'ativo'
      and r.usuario_id = auth.uid() and r.status = 'ativo')
$$;

-- eh_familia_do_time continua só para quem edita (lançar jogos, criar campeonato)
create or replace function public.eh_familia_do_time(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from jogador_times jt
    join jogador_responsaveis r on r.jogador_id = jt.jogador_id
    where jt.time_id = t and jt.status = 'ativo'
      and r.usuario_id = auth.uid() and r.status = 'ativo' and r.papel in ('titular', 'responsavel'))
$$;

create or replace function public.pode_ver_time(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.eh_dono_time(t) or public.eh_membro_do_time(t)
$$;

create or replace function public.pode_ver_jogador(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.eh_membro(j)
      or exists (select 1 from jogador_times jt join times t on t.id = jt.time_id
                 where jt.jogador_id = j and jt.status = 'ativo' and t.dono_id = auth.uid())
$$;

-- O limite de 4 vale para quem edita; família só para ver não conta
create or replace function public.limite_responsaveis() returns trigger
language plpgsql as $$
begin
  if new.status = 'ativo' and new.papel <> 'leitor' and (
    select count(*) from public.jogador_responsaveis
    where jogador_id = new.jogador_id and status = 'ativo' and papel <> 'leitor' and usuario_id <> new.usuario_id
  ) >= 4 then
    raise exception 'Este jogador já tem 4 responsáveis.';
  end if;
  return new;
end $$;

create or replace function public.aceitar_convite(p_codigo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c convites_responsavel;
begin
  select * into c from convites_responsavel where codigo = upper(trim(p_codigo)) for update;
  if c.codigo is null or c.usado_por is not null or c.expira_em < now() then
    raise exception 'Convite inválido ou expirado. Peça um novo código ao responsável.';
  end if;
  insert into jogador_responsaveis (jogador_id, usuario_id, papel, status, convidado_por, aprovado_por)
  values (c.jogador_id, auth.uid(), c.papel, 'ativo', c.criado_por, c.criado_por)
  on conflict (jogador_id, usuario_id) do update
    set status = 'ativo',
        -- quem já edita não perde a permissão ao usar um convite de só ver
        papel = case when jogador_responsaveis.papel = 'leitor' then excluded.papel else jogador_responsaveis.papel end;
  update convites_responsavel set usado_por = auth.uid() where codigo = c.codigo;
  return c.jogador_id;
end $$;

drop policy if exists "ver responsáveis" on public.jogador_responsaveis;
create policy "ver responsáveis" on public.jogador_responsaveis for select using (public.eh_membro(jogador_id));

drop policy if exists "ver participações" on public.jogo_participacoes;
create policy "ver participações" on public.jogo_participacoes for select using (
  public.eh_membro(jogador_id)
  or exists (select 1 from public.jogos g where g.id = jogo_id and public.eh_dono_time(g.time_id)));

drop policy if exists "ver fotos do jogo" on public.jogo_fotos;
create policy "ver fotos do jogo" on public.jogo_fotos for select using (
  enviado_por = auth.uid() or visibilidade = 'publico'
  or exists (select 1 from public.jogos g join public.jogo_participacoes jp on jp.jogo_id = g.id
             where g.id = jogo_id and public.eh_membro(jp.jogador_id))
  or (visibilidade = 'time' and exists (select 1 from public.jogos g where g.id = jogo_id and public.pode_ver_time(g.time_id))));

create or replace view public.perfil_publico as
select
  j.id,
  j.nome,
  public.categoria_natural(j.data_nascimento) as categoria,
  extract(year from j.data_nascimento)::int as ano,
  case when j.foto_publica then j.foto_url end as foto_url,
  count(jp.jogo_id)::int as jogos,
  coalesce(sum(jp.gols), 0)::int as gols,
  coalesce(sum(jp.assistencias), 0)::int as assistencias,
  coalesce(sum(jp.amarelos + jp.vermelho::int), 0)::int as cartoes,
  j.apelido
from public.jogadores j
left join (
  select p.* from public.jogo_participacoes p
  join public.jogos g on g.id = p.jogo_id
  where g.substituido_por is null and g.data_hora <= now()
) jp on jp.jogador_id = j.id
where j.visibilidade = 'publico'
   or public.eh_membro(j.id)
   or (j.visibilidade = 'aprovados' and exists (
         select 1 from public.seguidores_aprovados s where s.jogador_id = j.id and s.usuario_id = auth.uid()))
group by j.id;
grant select on public.perfil_publico to authenticated;

-- =====================================================================
-- 2. Resumo do jogo e escudos dos adversários
-- =====================================================================

alter table public.jogos add column if not exists resumo text;

create table if not exists public.adversarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  escudo_url text,
  criado_por uuid not null default auth.uid() references public.usuarios (id) on delete cascade,
  criado_em timestamptz not null default now()
);
create unique index if not exists adversarios_nome_por_usuario on public.adversarios (criado_por, lower(trim(nome)));
alter table public.adversarios enable row level security;

-- Escudos de adversário são de uso comum: todos os usuários veem, cada um edita os seus
drop policy if exists "ver adversários" on public.adversarios;
create policy "ver adversários" on public.adversarios for select to authenticated using (true);
drop policy if exists "criar adversário" on public.adversarios;
create policy "criar adversário" on public.adversarios for insert with check (criado_por = auth.uid());
drop policy if exists "editar adversário" on public.adversarios;
create policy "editar adversário" on public.adversarios for update using (criado_por = auth.uid());
drop policy if exists "apagar adversário" on public.adversarios;
create policy "apagar adversário" on public.adversarios for delete using (criado_por = auth.uid());
grant select, insert, update, delete on public.adversarios to authenticated;

-- =====================================================================
-- 3. Editar e excluir jogos
-- =====================================================================

-- Pode editar/excluir quem lançou o jogo ou o dono do time
create or replace function public.pode_editar_jogo(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from jogos where id = g and (lancado_por = auth.uid() or public.eh_dono_time(time_id)))
$$;

drop policy if exists "editar jogo" on public.jogos;
create policy "editar jogo" on public.jogos for update using (public.pode_editar_jogo(id));
drop policy if exists "apagar jogo" on public.jogos;
create policy "apagar jogo" on public.jogos for delete using (public.pode_editar_jogo(id));

create or replace function public.editar_jogo(p_jogo_id uuid, p_jogo jsonb, p_participacoes jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  g jogos;
  v_data timestamptz := (p_jogo ->> 'data_hora')::timestamptz;
  v_categoria text := p_jogo ->> 'categoria';
  p jsonb;
  v_jogador jogadores;
  v_tecnico boolean;
begin
  select * into g from jogos where id = p_jogo_id for update;
  if g.id is null or not public.pode_editar_jogo(g.id) then
    raise exception 'Você não pode alterar este jogo.';
  end if;
  v_tecnico := public.eh_dono_time(g.time_id);

  update jogos set
    categoria = v_categoria, data_hora = v_data, adversario = p_jogo ->> 'adversario',
    tipo = coalesce(p_jogo ->> 'tipo', 'amistoso'), campeonato_id = nullif(p_jogo ->> 'campeonato_id', '')::uuid,
    fase = nullif(p_jogo ->> 'fase', ''), local = nullif(p_jogo ->> 'local', ''), casa_fora = nullif(p_jogo ->> 'casa_fora', ''),
    gols_pro = coalesce((p_jogo ->> 'gols_pro')::int, 0), gols_contra = coalesce((p_jogo ->> 'gols_contra')::int, 0),
    resumo = nullif(p_jogo ->> 'resumo', '')
  where id = g.id;

  -- Refaz as participações dos jogadores que a pessoa pode lançar
  delete from jogo_participacoes jp
  where jp.jogo_id = g.id and (v_tecnico or public.eh_responsavel(jp.jogador_id));

  for p in select * from jsonb_array_elements(coalesce(p_participacoes, '[]'))
  loop
    select * into v_jogador from jogadores where id = (p ->> 'jogador_id')::uuid;
    if v_jogador.id is null then raise exception 'Jogador não encontrado.'; end if;
    if not (public.eh_responsavel(v_jogador.id) or (v_tecnico and exists (
        select 1 from jogador_times where jogador_id = v_jogador.id and time_id = g.time_id and status = 'ativo'))) then
      raise exception 'Você não pode lançar dados de %.', v_jogador.nome;
    end if;
    if not public.pode_jogar_idade(v_jogador.data_nascimento, v_categoria, extract(year from v_data)::int) then
      raise exception '% não pode jogar no %.', v_jogador.nome, v_categoria;
    end if;
    insert into jogo_participacoes (jogo_id, jogador_id, gols, assistencias, amarelos, vermelho,
                                    suspenso_proximo, titular, craque_do_jogo, observacao)
    values (g.id, v_jogador.id, coalesce((p ->> 'gols')::int, 0), coalesce((p ->> 'assistencias')::int, 0),
            coalesce((p ->> 'amarelos')::int, 0), coalesce((p ->> 'vermelho')::boolean, false),
            coalesce((p ->> 'suspenso_proximo')::boolean, false), coalesce((p ->> 'titular')::boolean, true),
            coalesce((p ->> 'craque_do_jogo')::boolean, false), nullif(p ->> 'observacao', ''));
  end loop;
  return g.id;
end $$;

revoke execute on function public.editar_jogo(uuid, jsonb, jsonb) from anon, public;
grant execute on function public.editar_jogo(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.eh_membro(uuid) to authenticated;
grant execute on function public.eh_membro_do_time(uuid) to authenticated;
grant execute on function public.pode_editar_jogo(uuid) to authenticated;

-- =====================================================================
-- 4. Fotos (jogador e capa) e escudos no Storage
-- =====================================================================
-- escudos: público (escudo de time não é dado pessoal). Pasta = id do usuário.
-- fotos: privado. Pasta = id do jogador; só a família vê, só quem edita envia.

insert into storage.buckets (id, name, public) values ('escudos', 'escudos', true)
  on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false)
  on conflict (id) do update set public = false;

drop policy if exists "escudos: enviar" on storage.objects;
create policy "escudos: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'escudos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "escudos: trocar" on storage.objects;
create policy "escudos: trocar" on storage.objects for update to authenticated
  using (bucket_id = 'escudos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "escudos: apagar" on storage.objects;
create policy "escudos: apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'escudos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "escudos: ver" on storage.objects;
create policy "escudos: ver" on storage.objects for select to authenticated
  using (bucket_id = 'escudos');

create or replace function public.pasta_jogador(nome_arquivo text) returns uuid
language plpgsql immutable as $$
begin
  return (storage.foldername(nome_arquivo))[1]::uuid;
exception when others then
  return null;
end $$;

drop policy if exists "fotos: ver" on storage.objects;
create policy "fotos: ver" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public.pode_ver_jogador(public.pasta_jogador(name)));
drop policy if exists "fotos: enviar" on storage.objects;
create policy "fotos: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.eh_responsavel(public.pasta_jogador(name)));
drop policy if exists "fotos: trocar" on storage.objects;
create policy "fotos: trocar" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.eh_responsavel(public.pasta_jogador(name)));
drop policy if exists "fotos: apagar" on storage.objects;
create policy "fotos: apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.eh_responsavel(public.pasta_jogador(name)));

-- ===== Conferência: deve mostrar 5 linhas com "ok" =====
select 'família só para ver' as item, case when exists (select 1 from pg_proc where proname = 'eh_membro') then 'ok' else 'FALTANDO' end as situacao
union all select 'editar jogo', case when exists (select 1 from pg_proc where proname = 'editar_jogo') then 'ok' else 'FALTANDO' end
union all select 'resumo do jogo', case when exists (select 1 from information_schema.columns where table_name = 'jogos' and column_name = 'resumo') then 'ok' else 'FALTANDO' end
union all select 'escudos de adversários', case when to_regclass('public.adversarios') is not null then 'ok' else 'FALTANDO' end
union all select 'pastas de fotos e escudos', case when (select count(*) from storage.buckets where id in ('fotos', 'escudos')) = 2 then 'ok' else 'FALTANDO' end;
