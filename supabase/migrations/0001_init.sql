-- Craque da Vez: esquema inicial (documento, itens 2 a 9 e 12)
-- Rodar no SQL Editor do Supabase ou com `supabase db push`.

create extension if not exists pgcrypto;

-- =====================================================================
-- Regras de categoria (espelho de src/lib/categorias.ts)
-- =====================================================================

create or replace function public.fim_da_base() returns int
language sql immutable as $$ select 20 $$;  -- pendente de decisão (doc 4.3)

create or replace function public.categoria_natural(nascimento date, temporada int default extract(year from now())::int)
returns text language sql immutable as $$
  select case
    when temporada - extract(year from nascimento)::int <= public.fim_da_base()
      then 'Sub-' || greatest(temporada - extract(year from nascimento)::int, 5)
    when temporada - extract(year from nascimento)::int >= 50 then 'Cinquentinha'
    when temporada - extract(year from nascimento)::int >= 40 then 'Veterano'
    when temporada - extract(year from nascimento)::int >= 35 then 'Master'
    else 'Livre'
  end
$$;

create or replace function public.pode_jogar_idade(nascimento date, categoria text, temporada int)
returns boolean language plpgsql immutable as $$
declare
  idade int := temporada - extract(year from nascimento)::int;
  minimo int;
begin
  if categoria ~ '^Sub-[0-9]+$' then
    return substring(categoria from 5)::int >= idade
       and substring(categoria from 5)::int <= public.fim_da_base();
  end if;
  minimo := case categoria
    when 'Livre' then public.fim_da_base() + 1
    when 'Master' then 35
    when 'Veterano' then 40
    when 'Cinquentinha' then 50
  end;
  if minimo is null then return false; end if;
  if idade <= public.fim_da_base() then
    return categoria = 'Livre';  -- base pode jogar no Livre (pendente, doc 4.3)
  end if;
  return idade >= minimo;
end $$;

-- =====================================================================
-- Tabelas
-- =====================================================================

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  data_nascimento date not null,
  criado_em timestamptz not null default now()
);

create table public.jogadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  data_nascimento date not null,
  perna_dominante text check (perna_dominante in ('direita', 'esquerda', 'ambidestro')),
  foto_url text,
  foto_publica boolean not null default false,
  capa_url text,
  visibilidade text not null default 'aprovados' check (visibilidade in ('publico', 'aprovados', 'privado')),
  criado_por uuid not null default auth.uid() references public.usuarios (id),
  criado_em timestamptz not null default now()
);

create table public.jogador_responsaveis (
  jogador_id uuid not null references public.jogadores (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  papel text not null default 'responsavel' check (papel in ('titular', 'responsavel')),
  status text not null default 'ativo' check (status in ('convidado', 'ativo')),
  convidado_por uuid references public.usuarios (id),
  aprovado_por uuid references public.usuarios (id),
  criado_em timestamptz not null default now(),
  primary key (jogador_id, usuario_id)
);

create table public.convites_responsavel (
  codigo text primary key default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  jogador_id uuid not null references public.jogadores (id) on delete cascade,
  criado_por uuid not null default auth.uid() references public.usuarios (id),
  usado_por uuid references public.usuarios (id),
  expira_em timestamptz not null default now() + interval '7 days',
  criado_em timestamptz not null default now()
);

create table public.seguidores_aprovados (
  jogador_id uuid not null references public.jogadores (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  aprovado_por uuid references public.usuarios (id),
  criado_em timestamptz not null default now(),
  primary key (jogador_id, usuario_id)
);

create table public.times (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  modalidade text not null check (modalidade in ('futsal', 'campo', 'society')),
  escudo_url text,
  cor text,
  tipo text not null default 'particular' check (tipo in ('particular', 'tecnico')),
  dono_id uuid not null default auth.uid() references public.usuarios (id),
  -- Código que o técnico passa às famílias para o atleta entrar no elenco
  codigo text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  criado_em timestamptz not null default now()
);

create table public.time_categorias (
  time_id uuid not null references public.times (id) on delete cascade,
  categoria text not null,
  primary key (time_id, categoria)
);

create table public.jogador_times (
  jogador_id uuid not null references public.jogadores (id) on delete cascade,
  time_id uuid not null references public.times (id) on delete cascade,
  posicao text,
  numero_camisa int check (numero_camisa between 0 and 99),
  status text not null default 'ativo' check (status in ('convidado', 'ativo')),
  aprovado_por_responsavel uuid references public.usuarios (id),
  criado_em timestamptz not null default now(),
  primary key (jogador_id, time_id)
);

create table public.campeonatos (
  id uuid primary key default gen_random_uuid(),
  time_id uuid not null references public.times (id) on delete cascade,
  nome text not null,
  temporada int not null default extract(year from now())::int,
  categoria text,
  situacao text not null default 'andamento' check (situacao in ('andamento', 'campeao', 'vice', 'eliminado')),
  criado_por uuid not null default auth.uid() references public.usuarios (id),
  criado_em timestamptz not null default now()
);

create table public.jogos (
  id uuid primary key default gen_random_uuid(),
  time_id uuid not null references public.times (id) on delete cascade,
  categoria text not null,
  data_hora timestamptz not null,
  adversario text not null,
  tipo text not null default 'amistoso' check (tipo in ('amistoso', 'treino', 'campeonato')),
  campeonato_id uuid references public.campeonatos (id) on delete set null,
  fase text check (fase in ('grupos', 'oitavas', 'quartas', 'semifinal', 'final')),
  local text,
  casa_fora text check (casa_fora in ('casa', 'fora')),
  gols_pro int not null default 0 check (gols_pro >= 0),
  gols_contra int not null default 0 check (gols_contra >= 0),
  resultado text generated always as (
    case when gols_pro > gols_contra then 'V' when gols_pro < gols_contra then 'D' else 'E' end
  ) stored,
  origem text not null default 'responsavel' check (origem in ('tecnico', 'responsavel')),
  oficial boolean not null default false,
  substituido_por uuid references public.jogos (id) on delete set null,
  lancado_por uuid not null default auth.uid() references public.usuarios (id),
  ao_vivo boolean not null default false,
  criado_em timestamptz not null default now(),
  check (tipo <> 'campeonato' or campeonato_id is not null)
);
create index jogos_time_data on public.jogos (time_id, categoria, data_hora);

create table public.jogo_participacoes (
  jogo_id uuid not null references public.jogos (id) on delete cascade,
  jogador_id uuid not null references public.jogadores (id) on delete cascade,
  gols int not null default 0 check (gols >= 0),
  assistencias int not null default 0 check (assistencias >= 0),
  amarelos int not null default 0 check (amarelos between 0 and 2),
  vermelho boolean not null default false,
  suspenso_proximo boolean not null default false,
  titular boolean not null default true,
  craque_do_jogo boolean not null default false,
  observacao text,
  primary key (jogo_id, jogador_id)
);

create table public.jogo_fotos (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos (id) on delete cascade,
  url text not null,
  visibilidade text not null default 'responsaveis' check (visibilidade in ('responsaveis', 'time', 'publico')),
  tem_outras_criancas boolean not null default false,
  enviado_por uuid not null default auth.uid() references public.usuarios (id),
  criado_em timestamptz not null default now()
);

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  tipo text not null,
  payload jsonb not null default '{}',
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);
create index notificacoes_usuario on public.notificacoes (usuario_id, lida, criado_em desc);

-- =====================================================================
-- Funções de permissão (security definer para não entrar em recursão de RLS)
-- =====================================================================

create or replace function public.eh_responsavel(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from jogador_responsaveis
                 where jogador_id = j and usuario_id = auth.uid() and status = 'ativo')
$$;

create or replace function public.eh_dono_time(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from times where id = t and dono_id = auth.uid())
$$;

-- Responsável de algum atleta ativo no time
create or replace function public.eh_familia_do_time(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from jogador_times jt
    join jogador_responsaveis r on r.jogador_id = jt.jogador_id
    where jt.time_id = t and jt.status = 'ativo'
      and r.usuario_id = auth.uid() and r.status = 'ativo')
$$;

create or replace function public.pode_ver_time(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.eh_dono_time(t) or public.eh_familia_do_time(t)
$$;

create or replace function public.pode_ver_jogador(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.eh_responsavel(j)
      or exists (select 1 from jogador_times jt join times t on t.id = jt.time_id
                 where jt.jogador_id = j and jt.status = 'ativo' and t.dono_id = auth.uid())
$$;

-- =====================================================================
-- Gatilhos
-- =====================================================================

-- Cadastro: cria o perfil e bloqueia menores de 18 (doc 2.1)
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  nasc date := nullif(new.raw_user_meta_data ->> 'data_nascimento', '')::date;
begin
  if nasc is null then
    raise exception 'Informe a data de nascimento.';
  end if;
  if age(current_date, nasc) < interval '18 years' then
    raise exception 'Só maiores de 18 anos criam conta. Atletas menores são cadastrados pelo responsável.';
  end if;
  insert into usuarios (id, nome, data_nascimento)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)), nasc);
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
for each row execute function public.novo_usuario();

-- Quem cadastra o jogador vira o responsável titular
create or replace function public.jogador_criado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into jogador_responsaveis (jogador_id, usuario_id, papel, status, aprovado_por)
  values (new.id, new.criado_por, 'titular', 'ativo', new.criado_por);
  return new;
end $$;

create trigger ao_criar_jogador after insert on public.jogadores
for each row execute function public.jogador_criado();

-- No máximo 4 responsáveis ativos por jogador (doc 2.1)
create or replace function public.limite_responsaveis() returns trigger
language plpgsql as $$
begin
  if new.status = 'ativo' and (
    select count(*) from public.jogador_responsaveis
    where jogador_id = new.jogador_id and status = 'ativo' and usuario_id <> new.usuario_id
  ) >= 4 then
    raise exception 'Este jogador já tem 4 responsáveis.';
  end if;
  return new;
end $$;

create trigger limite_4_responsaveis before insert or update on public.jogador_responsaveis
for each row execute function public.limite_responsaveis();

-- =====================================================================
-- RPCs
-- =====================================================================

-- Responsável aceita um convite para cuidar de um jogador
create or replace function public.aceitar_convite(p_codigo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c convites_responsavel;
begin
  select * into c from convites_responsavel where codigo = upper(trim(p_codigo)) for update;
  if c.codigo is null or c.usado_por is not null or c.expira_em < now() then
    raise exception 'Convite inválido ou expirado. Peça um novo código ao responsável.';
  end if;
  insert into jogador_responsaveis (jogador_id, usuario_id, papel, status, convidado_por, aprovado_por)
  values (c.jogador_id, auth.uid(), 'responsavel', 'ativo', c.criado_por, c.criado_por)
  on conflict (jogador_id, usuario_id) do update set status = 'ativo';
  update convites_responsavel set usado_por = auth.uid() where codigo = c.codigo;
  return c.jogador_id;
end $$;

-- Responsável coloca o próprio jogador no elenco de um time de técnico usando o código do time.
-- Digitar o código é a aprovação do responsável (LGPD).
create or replace function public.entrar_no_time(p_codigo text, p_jogador uuid, p_posicao text default null, p_numero int default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_time uuid;
begin
  if not public.eh_responsavel(p_jogador) then
    raise exception 'Você só pode colocar no time os seus jogadores.';
  end if;
  select id into v_time from times where codigo = upper(trim(p_codigo));
  if v_time is null then raise exception 'Código de time não encontrado. Confira com o técnico.'; end if;
  insert into jogador_times (jogador_id, time_id, posicao, numero_camisa, status, aprovado_por_responsavel)
  values (p_jogador, v_time, p_posicao, p_numero, 'ativo', auth.uid())
  on conflict (jogador_id, time_id) do update
    set status = 'ativo', aprovado_por_responsavel = auth.uid(),
        posicao = coalesce(excluded.posicao, jogador_times.posicao),
        numero_camisa = coalesce(excluded.numero_camisa, jogador_times.numero_camisa);
  return v_time;
end $$;

-- Lança um jogo com as participações numa única transação.
-- Aplica a regra técnico × responsável (doc 2.3) e cria as notificações.
create or replace function public.lancar_jogo(p_jogo jsonb, p_participacoes jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_time times;
  v_jogo_id uuid;
  v_origem text;
  v_data timestamptz := (p_jogo ->> 'data_hora')::timestamptz;
  v_categoria text := p_jogo ->> 'categoria';
  p jsonb;
  v_jogador jogadores;
  v_dup uuid;
begin
  select * into v_time from times where id = (p_jogo ->> 'time_id')::uuid;
  if v_time.id is null or not (public.eh_dono_time(v_time.id) or public.eh_familia_do_time(v_time.id)) then
    raise exception 'Você não pode lançar jogos deste time.';
  end if;
  v_origem := case when v_time.tipo = 'tecnico' and v_time.dono_id = auth.uid() then 'tecnico' else 'responsavel' end;

  insert into jogos (time_id, categoria, data_hora, adversario, tipo, campeonato_id, fase, local, casa_fora,
                     gols_pro, gols_contra, origem, oficial, lancado_por, ao_vivo)
  values (v_time.id, v_categoria, v_data, p_jogo ->> 'adversario',
          coalesce(p_jogo ->> 'tipo', 'amistoso'), nullif(p_jogo ->> 'campeonato_id', '')::uuid,
          nullif(p_jogo ->> 'fase', ''), nullif(p_jogo ->> 'local', ''), nullif(p_jogo ->> 'casa_fora', ''),
          coalesce((p_jogo ->> 'gols_pro')::int, 0), coalesce((p_jogo ->> 'gols_contra')::int, 0),
          v_origem, v_origem = 'tecnico' or v_time.tipo = 'particular', auth.uid(),
          coalesce((p_jogo ->> 'ao_vivo')::boolean, false))
  returning id into v_jogo_id;

  for p in select * from jsonb_array_elements(coalesce(p_participacoes, '[]'))
  loop
    select * into v_jogador from jogadores where id = (p ->> 'jogador_id')::uuid;
    if v_jogador.id is null then raise exception 'Jogador não encontrado.'; end if;
    -- Responsável só lança os próprios jogadores; técnico, os do elenco
    if not (public.eh_responsavel(v_jogador.id) or (v_origem = 'tecnico' and exists (
        select 1 from jogador_times where jogador_id = v_jogador.id and time_id = v_time.id and status = 'ativo'))) then
      raise exception 'Você não pode lançar dados de %.', v_jogador.nome;
    end if;
    if not public.pode_jogar_idade(v_jogador.data_nascimento, v_categoria, extract(year from v_data)::int) then
      raise exception '% não pode jogar no %.', v_jogador.nome, v_categoria;
    end if;
    insert into jogo_participacoes (jogo_id, jogador_id, gols, assistencias, amarelos, vermelho,
                                    suspenso_proximo, titular, craque_do_jogo, observacao)
    values (v_jogo_id, v_jogador.id, coalesce((p ->> 'gols')::int, 0), coalesce((p ->> 'assistencias')::int, 0),
            coalesce((p ->> 'amarelos')::int, 0), coalesce((p ->> 'vermelho')::boolean, false),
            coalesce((p ->> 'suspenso_proximo')::boolean, false), coalesce((p ->> 'titular')::boolean, true),
            coalesce((p ->> 'craque_do_jogo')::boolean, false), nullif(p ->> 'observacao', ''));
  end loop;

  if v_origem = 'tecnico' then
    -- Jogos do responsável no mesmo time, categoria e dia passam a ser substituídos pelo oficial
    for v_dup in
      select id from jogos
      where time_id = v_time.id and categoria = v_categoria and origem = 'responsavel'
        and substituido_por is null and (data_hora at time zone 'America/Sao_Paulo')::date
          = (v_data at time zone 'America/Sao_Paulo')::date
    loop
      update jogos set substituido_por = v_jogo_id, oficial = false where id = v_dup;
      insert into notificacoes (usuario_id, tipo, payload)
      select distinct r.usuario_id, 'divergencia',
             jsonb_build_object('jogo_oficial', v_jogo_id, 'jogo_substituido', v_dup, 'time', v_time.nome)
      from jogo_participacoes jp join jogador_responsaveis r on r.jogador_id = jp.jogador_id and r.status = 'ativo'
      where jp.jogo_id = v_dup;
    end loop;

    -- Aviso para cada responsável dos atletas que jogaram
    insert into notificacoes (usuario_id, tipo, payload)
    select r.usuario_id, 'jogo_lancado_tecnico',
           jsonb_build_object('jogo_id', v_jogo_id, 'time', v_time.nome, 'adversario', p_jogo ->> 'adversario',
                              'jogador', j.nome, 'gols', jp.gols, 'assistencias', jp.assistencias)
    from jogo_participacoes jp
    join jogadores j on j.id = jp.jogador_id
    join jogador_responsaveis r on r.jogador_id = jp.jogador_id and r.status = 'ativo'
    where jp.jogo_id = v_jogo_id and r.usuario_id <> auth.uid();
  end if;

  return v_jogo_id;
end $$;

-- =====================================================================
-- Perfil público (doc 2.4 e 9): nome, categoria e estatísticas.
-- Nunca expõe data de nascimento completa, foto sem autorização nem jogos futuros.
-- =====================================================================

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
  coalesce(sum(jp.amarelos + jp.vermelho::int), 0)::int as cartoes
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

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.usuarios enable row level security;
alter table public.jogadores enable row level security;
alter table public.jogador_responsaveis enable row level security;
alter table public.convites_responsavel enable row level security;
alter table public.seguidores_aprovados enable row level security;
alter table public.times enable row level security;
alter table public.time_categorias enable row level security;
alter table public.jogador_times enable row level security;
alter table public.campeonatos enable row level security;
alter table public.jogos enable row level security;
alter table public.jogo_participacoes enable row level security;
alter table public.jogo_fotos enable row level security;
alter table public.notificacoes enable row level security;

create policy "usuario lê o próprio perfil" on public.usuarios for select using (id = auth.uid());
create policy "usuario edita o próprio perfil" on public.usuarios for update using (id = auth.uid());

create policy "ver jogador" on public.jogadores for select using (public.pode_ver_jogador(id));
create policy "criar jogador" on public.jogadores for insert with check (criado_por = auth.uid());
create policy "editar jogador" on public.jogadores for update using (public.eh_responsavel(id));
create policy "apagar jogador" on public.jogadores for delete using (public.eh_responsavel(id));

create policy "ver responsáveis" on public.jogador_responsaveis for select using (public.eh_responsavel(jogador_id));
create policy "remover responsável" on public.jogador_responsaveis for delete using (public.eh_responsavel(jogador_id));

create policy "ver convites" on public.convites_responsavel for select using (public.eh_responsavel(jogador_id));
create policy "criar convite" on public.convites_responsavel for insert
  with check (public.eh_responsavel(jogador_id) and criado_por = auth.uid());

create policy "ver seguidores" on public.seguidores_aprovados for select
  using (public.eh_responsavel(jogador_id) or usuario_id = auth.uid());
create policy "aprovar seguidor" on public.seguidores_aprovados for all
  using (public.eh_responsavel(jogador_id)) with check (public.eh_responsavel(jogador_id));

create policy "ver time" on public.times for select using (public.pode_ver_time(id));
create policy "criar time" on public.times for insert with check (dono_id = auth.uid());
create policy "editar time" on public.times for update using (dono_id = auth.uid());
create policy "apagar time" on public.times for delete using (dono_id = auth.uid());

create policy "ver categorias do time" on public.time_categorias for select using (public.pode_ver_time(time_id));
create policy "editar categorias do time" on public.time_categorias for all
  using (public.eh_dono_time(time_id)) with check (public.eh_dono_time(time_id));

create policy "ver elenco" on public.jogador_times for select
  using (public.eh_responsavel(jogador_id) or public.eh_dono_time(time_id));
-- Família põe o próprio jogador num time particular dela; técnico só convida (o responsável aprova)
create policy "entrar no time" on public.jogador_times for insert with check (
  (public.eh_responsavel(jogador_id) and public.eh_dono_time(time_id))
  or (public.eh_dono_time(time_id) and status = 'convidado'));
create policy "editar vínculo" on public.jogador_times for update
  using (public.eh_responsavel(jogador_id) or public.eh_dono_time(time_id));
create policy "sair do time" on public.jogador_times for delete
  using (public.eh_responsavel(jogador_id) or public.eh_dono_time(time_id));

create policy "ver campeonatos" on public.campeonatos for select using (public.pode_ver_time(time_id));
create policy "criar campeonato" on public.campeonatos for insert
  with check (public.pode_ver_time(time_id) and criado_por = auth.uid());
create policy "editar campeonato" on public.campeonatos for update
  using (criado_por = auth.uid() or public.eh_dono_time(time_id));

-- Jogos: só quem é do time vê. Inserção passa pela RPC lancar_jogo.
create policy "ver jogos" on public.jogos for select using (public.pode_ver_time(time_id));
create policy "editar jogo" on public.jogos for update using (lancado_por = auth.uid());
create policy "apagar jogo" on public.jogos for delete using (lancado_por = auth.uid());

create policy "ver participações" on public.jogo_participacoes for select using (
  public.eh_responsavel(jogador_id)
  or exists (select 1 from public.jogos g where g.id = jogo_id and public.eh_dono_time(g.time_id)));
create policy "editar participação" on public.jogo_participacoes for update using (
  exists (select 1 from public.jogos g where g.id = jogo_id and g.lancado_por = auth.uid()));

create policy "ver fotos do jogo" on public.jogo_fotos for select using (
  enviado_por = auth.uid() or visibilidade = 'publico'
  or exists (select 1 from public.jogos g join public.jogo_participacoes jp on jp.jogo_id = g.id
             where g.id = jogo_id and public.eh_responsavel(jp.jogador_id))
  or (visibilidade = 'time' and exists (select 1 from public.jogos g where g.id = jogo_id and public.pode_ver_time(g.time_id))));
create policy "enviar foto" on public.jogo_fotos for insert with check (
  enviado_por = auth.uid()
  and exists (select 1 from public.jogos g where g.id = jogo_id and public.pode_ver_time(g.time_id)));
create policy "apagar foto" on public.jogo_fotos for delete using (enviado_por = auth.uid());

create policy "ver notificações" on public.notificacoes for select using (usuario_id = auth.uid());
create policy "marcar como lida" on public.notificacoes for update using (usuario_id = auth.uid());

grant select on public.perfil_publico to authenticated;
grant execute on function public.lancar_jogo(jsonb, jsonb) to authenticated;
grant execute on function public.aceitar_convite(text) to authenticated;
grant execute on function public.entrar_no_time(text, uuid, text, int) to authenticated;
