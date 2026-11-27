-- Craque da Vez: rodada de melhorias (goleiro, pelada, curtidas e comentários, liberação de contas, painel do administrador).
-- Pode rodar mais de uma vez. Não apaga dados.

-- =====================================================================
-- 1. Goleiro
-- =====================================================================
alter table public.jogadores add column if not exists funcao text not null default 'linha';
alter table public.jogadores drop constraint if exists jogadores_funcao_check;
alter table public.jogadores add constraint jogadores_funcao_check check (funcao in ('linha', 'goleiro'));

alter table public.jogo_participacoes add column if not exists goleiro boolean not null default false;
alter table public.jogo_participacoes add column if not exists gols_sofridos int check (gols_sofridos >= 0);
alter table public.jogo_participacoes add column if not exists defesas int not null default 0 check (defesas >= 0);
alter table public.jogo_participacoes add column if not exists defesas_dificeis int not null default 0 check (defesas_dificeis >= 0);
alter table public.jogo_participacoes add column if not exists penaltis_defendidos int not null default 0 check (penaltis_defendidos >= 0);
alter table public.jogo_participacoes add column if not exists relato_defesas text check (relato_defesas is null or length(relato_defesas) <= 500);

-- Quem pode editar o jogo também completa os números do goleiro
drop policy if exists "editar participação" on public.jogo_participacoes;
create policy "editar participação" on public.jogo_participacoes for update using (public.pode_editar_jogo(jogo_id));

-- =====================================================================
-- 2. Pelada como tipo de jogo (treino e pelada ficam fora das estatísticas)
-- =====================================================================
alter table public.jogos drop constraint if exists jogos_tipo_check;
alter table public.jogos add constraint jogos_tipo_check check (tipo in ('amistoso', 'treino', 'pelada', 'campeonato'));

create or replace view public.perfil_publico as
select
  j.id,
  j.apelido,
  public.categoria_natural(j.data_nascimento) as categoria,
  (select string_agg(t.nome, ', ' order by t.nome) from jogador_times jt join times t on t.id = jt.time_id
     where jt.jogador_id = j.id and jt.status = 'ativo') as times,
  count(jp.jogo_id)::int as jogos,
  coalesce(sum(jp.gols), 0)::int as gols,
  coalesce(sum(jp.assistencias), 0)::int as assistencias,
  coalesce(sum(jp.amarelos + jp.vermelho::int), 0)::int as cartoes
from public.jogadores j
left join (
  select p.* from public.jogo_participacoes p
  join public.jogos g on g.id = p.jogo_id
  where g.substituido_por is null and g.data_hora <= now() and g.tipo not in ('treino', 'pelada')
) jp on jp.jogador_id = j.id
where j.visibilidade = 'publico'
   or public.eh_membro(j.id)
   or (j.visibilidade = 'aprovados' and exists (
         select 1 from public.seguidores_aprovados s where s.jogador_id = j.id and s.usuario_id = auth.uid()))
group by j.id;
revoke all on public.perfil_publico from anon, public;
grant select on public.perfil_publico to authenticated;

-- =====================================================================
-- 3. Curtidas e comentários (sempre de um atleta: só a família dele vê)
-- =====================================================================
create table if not exists public.curtidas (
  jogo_id uuid not null references public.jogos (id) on delete cascade,
  jogador_id uuid not null references public.jogadores (id) on delete cascade,
  alvo text not null check (alvo in ('partida', 'gols')),
  usuario_id uuid not null default auth.uid() references public.usuarios (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (jogo_id, jogador_id, alvo, usuario_id)
);
create table if not exists public.comentarios (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos (id) on delete cascade,
  jogador_id uuid not null references public.jogadores (id) on delete cascade,
  alvo text not null check (alvo in ('partida', 'gols')),
  usuario_id uuid not null default auth.uid() references public.usuarios (id) on delete cascade,
  texto text not null check (length(trim(texto)) between 1 and 500),
  criado_em timestamptz not null default now()
);
create index if not exists comentarios_jogo on public.comentarios (jogo_id, jogador_id, criado_em);
alter table public.curtidas enable row level security;
alter table public.comentarios enable row level security;

drop policy if exists "ver curtidas" on public.curtidas;
create policy "ver curtidas" on public.curtidas for select using (public.eh_membro(jogador_id));
drop policy if exists "curtir" on public.curtidas;
create policy "curtir" on public.curtidas for insert with check (usuario_id = auth.uid() and public.eh_membro(jogador_id));
drop policy if exists "descurtir" on public.curtidas;
create policy "descurtir" on public.curtidas for delete using (usuario_id = auth.uid());

drop policy if exists "ver comentários" on public.comentarios;
create policy "ver comentários" on public.comentarios for select using (public.eh_membro(jogador_id));
drop policy if exists "comentar" on public.comentarios;
create policy "comentar" on public.comentarios for insert with check (usuario_id = auth.uid() and public.eh_membro(jogador_id));
drop policy if exists "apagar comentário" on public.comentarios;
create policy "apagar comentário" on public.comentarios for delete using (usuario_id = auth.uid() or public.eh_titular(jogador_id));
grant select, insert, delete on public.curtidas, public.comentarios to authenticated;

-- Curtidas e comentários com o nome e o parentesco de quem fez (só para a família do atleta)
create or replace function public.interacoes_do_jogo(p_jogo uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'curtidas', coalesce((select jsonb_agg(jsonb_build_object('jogador_id', c.jogador_id, 'alvo', c.alvo, 'usuario_id', c.usuario_id,
                    'nome', u.nome, 'parentesco', r.parentesco))
                  from curtidas c join usuarios u on u.id = c.usuario_id
                  left join jogador_responsaveis r on r.jogador_id = c.jogador_id and r.usuario_id = c.usuario_id
                  where c.jogo_id = p_jogo and public.eh_membro(c.jogador_id)), '[]'),
    'comentarios', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'jogador_id', m.jogador_id, 'alvo', m.alvo, 'usuario_id', m.usuario_id,
                    'nome', u.nome, 'parentesco', r.parentesco, 'texto', m.texto, 'criado_em', m.criado_em) order by m.criado_em)
                  from comentarios m join usuarios u on u.id = m.usuario_id
                  left join jogador_responsaveis r on r.jogador_id = m.jogador_id and r.usuario_id = m.usuario_id
                  where m.jogo_id = p_jogo and public.eh_membro(m.jogador_id)), '[]'))
$$;

-- =====================================================================
-- 4. Liberação de contas pelo administrador
-- =====================================================================
alter table public.usuarios add column if not exists aprovacao text not null default 'pendente';
alter table public.usuarios drop constraint if exists usuarios_aprovacao_check;
alter table public.usuarios add constraint usuarios_aprovacao_check check (aprovacao in ('pendente', 'liberado', 'recusado'));
alter table public.usuarios add column if not exists aprovado_em timestamptz;
-- quem já usa o app continua liberado
update public.usuarios set aprovacao = 'liberado', aprovado_em = coalesce(aprovado_em, now())
 where aprovacao = 'pendente' and criado_em < '2026-11-28 12:00:00+00';

create or replace function public.usuario_liberado() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from usuarios where id = auth.uid() and aprovacao = 'liberado') or public.eh_admin()
$$;

-- Conta aguardando liberação não cria nem altera nada (o app também mostra a tela de espera)
create or replace function public.exige_conta_liberada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.usuario_liberado() then
    raise exception 'Seu cadastro está em análise. Assim que for liberado, você poderá usar o app.';
  end if;
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['jogadores','times','jogos','jogador_responsaveis','jogador_times','campeonatos','curtidas','comentarios','convites_responsavel']
  loop
    execute format('drop trigger if exists exige_liberado on public.%I', t);
    execute format('create trigger exige_liberado before insert or update on public.%I for each row execute function public.exige_conta_liberada()', t);
  end loop;
end $$;

create or replace function public.definir_aprovacao(p_usuario uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Somente o administrador libera contas.'; end if;
  if p_status not in ('pendente', 'liberado', 'recusado') then raise exception 'Situação inválida.'; end if;
  update usuarios set aprovacao = p_status, aprovado_em = case when p_status = 'liberado' then now() else aprovado_em end where id = p_usuario;
end $$;

create or replace function public.minha_aprovacao() returns text
language sql stable security definer set search_path = public as $$
  select case when public.eh_admin() then 'liberado' else (select aprovacao from usuarios where id = auth.uid()) end
$$;

-- =====================================================================
-- 5. Painel do administrador completo
-- =====================================================================
create or replace function public.painel_admin_completo() returns jsonb
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.eh_admin() then raise exception 'Somente o administrador pode ver este painel.'; end if;
  return jsonb_build_object(
    'pessoas', coalesce((select jsonb_agg(p order by p.criado_em desc) from (
      select u.id, u.nome, a.email, u.telefone, u.criado_em, u.visto_em, u.aprovacao, a.email_confirmed_at is not null as email_confirmado,
        coalesce((select jsonb_agg(jsonb_build_object('apelido', j.apelido, 'nome', j.nome, 'categoria', public.categoria_natural(j.data_nascimento),
                   'times', (select string_agg(t.nome, ', ') from jogador_times jt join times t on t.id = jt.time_id where jt.jogador_id = j.id and jt.status = 'ativo')))
                  from jogador_responsaveis r join jogadores j on j.id = r.jogador_id where r.usuario_id = u.id and r.papel = 'titular'), '[]') as cadastrou,
        coalesce((select jsonb_agg(jsonb_build_object('apelido', j.apelido, 'parentesco', r.parentesco, 'papel', r.papel, 'status', r.status))
                  from jogador_responsaveis r join jogadores j on j.id = r.jogador_id where r.usuario_id = u.id and r.papel <> 'titular'), '[]') as convidado_em
      from usuarios u join auth.users a on a.id = u.id) p), '[]'),
    'atletas', coalesce((select jsonb_agg(x order by x.criado_em desc) from (
      select j.apelido, j.nome, public.categoria_natural(j.data_nascimento) as categoria, j.criado_em, u.nome as cadastrado_por,
        (select count(*) from jogo_participacoes p where p.jogador_id = j.id) as jogos,
        (select max(g.data_hora) from jogo_participacoes p join jogos g on g.id = p.jogo_id where p.jogador_id = j.id and g.data_hora <= now()) as ultimo_jogo
      from jogadores j join usuarios u on u.id = j.criado_por) x), '[]')
  );
end $$;

create or replace function public.contar_pendentes() returns int
language sql stable security definer set search_path = public as $$
  select case when public.eh_admin() then (select count(*)::int from usuarios where aprovacao = 'pendente') else 0 end
$$;

revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated;
