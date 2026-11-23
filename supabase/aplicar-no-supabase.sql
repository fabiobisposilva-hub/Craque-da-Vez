-- Craque da Vez: rode tudo de uma vez no SQL Editor do Supabase (pode rodar mais de uma vez).

-- ===== 0002_permissoes =====
-- Craque da Vez: permissões de acesso pela API.
-- Projetos novos do Supabase não liberam as tabelas para o app automaticamente.
-- Quem está logado (authenticated) recebe acesso às tabelas; a RLS continua
-- decidindo linha a linha o que cada um vê e edita. Visitantes (anon) não acessam nada.

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.usuarios, public.jogadores, public.jogador_responsaveis, public.convites_responsavel,
  public.seguidores_aprovados, public.times, public.time_categorias, public.jogador_times,
  public.campeonatos, public.jogos, public.jogo_participacoes, public.jogo_fotos, public.notificacoes
to authenticated;

grant select on public.perfil_publico to authenticated;

grant execute on all functions in schema public to authenticated;

-- As funções de ação não devem ser chamadas por quem não está logado
revoke execute on function public.lancar_jogo(jsonb, jsonb) from anon, public;
revoke execute on function public.aceitar_convite(text) from anon, public;
revoke execute on function public.entrar_no_time(text, uuid, text, int) from anon, public;

-- ===== 0003_corrige_cadastro =====
-- Craque da Vez: corrige "new row violates row-level security policy" ao cadastrar
-- jogador e time. O app pede a linha de volta logo após inserir (insert ... returning),
-- e nesse instante quem cadastrou ainda não aparece como responsável/dono.
-- Quem criou passa a poder ver o que criou.

drop policy if exists "ver jogador" on public.jogadores;
create policy "ver jogador" on public.jogadores for select
  using (criado_por = auth.uid() or public.pode_ver_jogador(id));

drop policy if exists "ver time" on public.times;
create policy "ver time" on public.times for select
  using (dono_id = auth.uid() or public.pode_ver_time(id));

drop policy if exists "ver campeonatos" on public.campeonatos;
create policy "ver campeonatos" on public.campeonatos for select
  using (criado_por = auth.uid() or public.pode_ver_time(time_id));

drop policy if exists "ver convites" on public.convites_responsavel;
create policy "ver convites" on public.convites_responsavel for select
  using (criado_por = auth.uid() or public.eh_responsavel(jogador_id));

-- ===== 0004_apelido =====
-- Craque da Vez: apelido do jogador
alter table public.jogadores add column if not exists apelido text
  check (apelido is null or length(apelido) <= 30);

-- Perfil público passa a mostrar o apelido
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
   or public.eh_responsavel(j.id)
   or (j.visibilidade = 'aprovados' and exists (
         select 1 from public.seguidores_aprovados s where s.jogador_id = j.id and s.usuario_id = auth.uid()))
group by j.id;

grant select on public.perfil_publico to authenticated;

-- ===== Conferência: deve mostrar 3 linhas com "ok" =====
select 'regra de cadastro do jogador' as item,
       case when qual like '%criado_por = auth.uid()%' then 'ok' else 'FALTANDO' end as situacao
from pg_policies where schemaname = 'public' and tablename = 'jogadores' and policyname = 'ver jogador'
union all
select 'campo apelido', case when count(*) = 1 then 'ok' else 'FALTANDO' end
from information_schema.columns where table_schema = 'public' and table_name = 'jogadores' and column_name = 'apelido'
union all
select 'permissão de gravar jogador',
       case when has_table_privilege('authenticated', 'public.jogadores', 'INSERT') then 'ok' else 'FALTANDO' end;
