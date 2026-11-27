-- Craque da Vez: privacidade (LGPD / ECA Digital). Pode rodar mais de uma vez. Não apaga jogos nem atletas.
-- Regras: fotos só para a família (responsáveis e convidados); técnico vê só nome, apelido e ano
-- (categoria) dos atletas do time dele, sem foto; perfil público só com apelido, time(s), sub e estatísticas;
-- sem cidade; sem foto pública; apelido obrigatório; sem login, nenhum acesso.

-- =====================================================================
-- 1. Quem vê o jogador: só a família (o técnico deixa de ler a ficha completa)
-- =====================================================================
create or replace function public.pode_ver_jogador(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.eh_membro(j)
$$;

-- Elenco para o técnico: só nome, apelido e ano de nascimento (o ano define a categoria). Sem foto, sem data completa.
create or replace function public.elenco_do_time(p_time uuid) returns table (id uuid, nome text, apelido text, ano_nascimento int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eh_dono_time(p_time) then
    raise exception 'Só o técnico (dono do time) vê o elenco.';
  end if;
  return query
    select j.id, j.nome, j.apelido, extract(year from j.data_nascimento)::int
    from jogadores j join jogador_times jt on jt.jogador_id = j.id
    where jt.time_id = p_time and jt.status = 'ativo';
end $$;

-- =====================================================================
-- 2. Perfil público: só apelido, time(s), sub e estatísticas
-- =====================================================================
drop view if exists public.perfil_publico;

-- Sem cidade e sem foto pública (para todos os atletas)
alter table public.jogadores drop column if exists cidade;
alter table public.jogadores drop column if exists uf;
alter table public.jogadores drop column if exists foto_publica;

-- Apelido obrigatório (é o que os outros veem)
update public.jogadores set apelido = split_part(trim(nome), ' ', 1) where apelido is null or trim(apelido) = '';
alter table public.jogadores alter column apelido set not null;
alter table public.jogadores drop constraint if exists jogadores_apelido_check;
alter table public.jogadores add constraint jogadores_apelido_check check (length(trim(apelido)) between 1 and 30);

create view public.perfil_publico as
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
  where g.substituido_por is null and g.data_hora <= now()
) jp on jp.jogador_id = j.id
where j.visibilidade = 'publico'
   or public.eh_membro(j.id)
   or (j.visibilidade = 'aprovados' and exists (
         select 1 from public.seguidores_aprovados s where s.jogador_id = j.id and s.usuario_id = auth.uid()))
group by j.id;
revoke all on public.perfil_publico from anon, public;
grant select on public.perfil_publico to authenticated;

-- =====================================================================
-- 3. Fotos de jogos: nunca públicas; só a família
-- =====================================================================
update public.jogo_fotos set visibilidade = 'responsaveis' where visibilidade <> 'responsaveis';
alter table public.jogo_fotos drop constraint if exists jogo_fotos_visibilidade_check;
alter table public.jogo_fotos add constraint jogo_fotos_visibilidade_check check (visibilidade = 'responsaveis');
drop policy if exists "ver fotos do jogo" on public.jogo_fotos;
create policy "ver fotos do jogo" on public.jogo_fotos for select using (
  enviado_por = auth.uid()
  or exists (select 1 from public.jogo_participacoes jp where jp.jogo_id = jogo_fotos.jogo_id and public.eh_membro(jp.jogador_id)));

-- =====================================================================
-- 4. Consentimentos (LGPD art. 14): prova de cada aceite e revogação
-- =====================================================================
create table if not exists public.consentimentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.usuarios (id) on delete cascade,
  jogador_id uuid references public.jogadores (id) on delete set null,
  tipo text not null check (tipo in ('maior_18','termos_uso','politica_privacidade','responsavel_legal',
                                     'tratamento_dados_menor','acesso_tecnico','visibilidade_perfil')),
  valor text not null,
  versao_documento text not null,
  aceito_em timestamptz not null default now(),
  ip text,
  user_agent text,
  revogado_em timestamptz
);
create index if not exists consentimentos_usuario on public.consentimentos (usuario_id, jogador_id, tipo);
alter table public.consentimentos enable row level security;
drop policy if exists "ver meus consentimentos" on public.consentimentos;
create policy "ver meus consentimentos" on public.consentimentos for select
  using (usuario_id = auth.uid() or (jogador_id is not null and public.eh_responsavel(jogador_id)));
grant select on public.consentimentos to authenticated;

-- Grava um consentimento com IP e navegador da requisição; a escolha anterior do mesmo tipo é marcada como revogada.
create or replace function public.registrar_consentimento(p_jogador uuid, p_tipo text, p_valor text, p_versao text)
returns void language plpgsql security definer set search_path = public as $$
declare h json;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
  if p_jogador is not null and not public.eh_responsavel(p_jogador) then
    raise exception 'Só o responsável pelo atleta pode dar ou retirar consentimento.';
  end if;
  begin h := current_setting('request.headers', true)::json; exception when others then h := null; end;
  update consentimentos set revogado_em = now()
   where usuario_id = auth.uid() and jogador_id is not distinct from p_jogador and tipo = p_tipo and revogado_em is null;
  insert into consentimentos (usuario_id, jogador_id, tipo, valor, versao_documento, ip, user_agent)
  values (auth.uid(), p_jogador, p_tipo, p_valor, p_versao,
          coalesce(split_part(h ->> 'x-forwarded-for', ',', 1), h ->> 'x-real-ip'), left(h ->> 'user-agent', 300));
end $$;

-- Cadastro do adulto: grava os aceites dados na tela (18+, termos, política)
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  nasc date := nullif(new.raw_user_meta_data ->> 'data_nascimento', '')::date;
  versao text := coalesce(nullif(new.raw_user_meta_data ->> 'versao_termos', ''), '1.1');
begin
  if nasc is null then
    raise exception 'Informe a data de nascimento.';
  end if;
  if age(current_date, nasc) < interval '18 years' then
    raise exception 'Você precisa ter 18 anos ou mais para criar uma conta. Peça para seu pai, mãe ou responsável criar a conta e cadastrar você.';
  end if;
  if coalesce(new.raw_user_meta_data ->> 'aceitou_termos', '') <> 'true' then
    raise exception 'Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.';
  end if;
  insert into usuarios (id, nome, data_nascimento, telefone, termos_aceitos_em)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    nasc,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'telefone', ''), '\D', '', 'g'), ''),
    now()
  );
  insert into consentimentos (usuario_id, tipo, valor, versao_documento, user_agent)
  values (new.id, 'maior_18', 'aceito', versao, left(new.raw_user_meta_data ->> 'user_agent', 300)),
         (new.id, 'termos_uso', 'aceito', versao, left(new.raw_user_meta_data ->> 'user_agent', 300)),
         (new.id, 'politica_privacidade', 'aceito', versao, left(new.raw_user_meta_data ->> 'user_agent', 300));
  return new;
end $$;

-- =====================================================================
-- 5. Direitos do titular: excluir atleta e excluir conta
-- =====================================================================
create or replace function public.excluir_jogador(p_jogador uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_titular(p_jogador) then
    raise exception 'Só quem cadastrou o atleta pode excluí-lo.';
  end if;
  update consentimentos set revogado_em = coalesce(revogado_em, now()) where jogador_id = p_jogador;
  delete from jogadores where id = p_jogador;   -- apaga participações, vínculos e família em cascata
end $$;

create or replace function public.excluir_minha_conta() returns void
language plpgsql security definer set search_path = public, auth as $$
declare eu uuid := auth.uid();
begin
  if eu is null then raise exception 'Entre na sua conta.'; end if;
  -- atletas que eu cadastrei
  delete from jogadores where id in (select jogador_id from jogador_responsaveis where usuario_id = eu and papel = 'titular');
  -- times que são meus (jogos, campeonatos e colegas vão junto)
  delete from times where dono_id = eu;
  -- o que eu lancei/criei em times de outras pessoas
  delete from jogos where lancado_por = eu;
  update campeonatos c set criado_por = t.dono_id from times t where t.id = c.time_id and c.criado_por = eu;
  update time_colegas c set criado_por = t.dono_id from times t where t.id = c.time_id and c.criado_por = eu;
  delete from convites_responsavel where criado_por = eu;
  update convites_responsavel set usado_por = null where usado_por = eu;
  delete from jogo_fotos where enviado_por = eu;
  update jogador_responsaveis set aprovado_por = null where aprovado_por = eu;
  update jogador_responsaveis set convidado_por = null where convidado_por = eu;
  update jogador_times set aprovado_por_responsavel = null where aprovado_por_responsavel = eu;
  update seguidores_aprovados set aprovado_por = null where aprovado_por = eu;
  delete from auth.users where id = eu;         -- usuários, consentimentos, família, papéis de parede em cascata
end $$;

-- =====================================================================
-- 6. Sem login, nenhum acesso: funções só para usuários logados
-- =====================================================================
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public revoke execute on functions from anon, public;
alter default privileges in schema public grant execute on functions to authenticated;
