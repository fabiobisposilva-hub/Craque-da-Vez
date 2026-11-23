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
