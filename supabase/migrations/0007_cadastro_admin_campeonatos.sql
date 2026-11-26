-- Craque da Vez: telefone e aceite dos termos no cadastro, painel do administrador,
-- excluir campeonato. Pode rodar mais de uma vez.

-- =====================================================================
-- 1. Cadastro: telefone, aceite dos termos e último acesso
-- =====================================================================
alter table public.usuarios add column if not exists telefone text;
alter table public.usuarios add column if not exists termos_aceitos_em timestamptz;
alter table public.usuarios add column if not exists visto_em timestamptz;

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
  insert into usuarios (id, nome, data_nascimento, telefone, termos_aceitos_em)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    nasc,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'telefone', ''), '\D', '', 'g'), ''),
    case when (new.raw_user_meta_data ->> 'aceitou_termos') = 'true' then now() end
  );
  return new;
end $$;

-- O app avisa que a pessoa está usando (para o painel do administrador)
create or replace function public.marcar_acesso() returns void
language sql security definer set search_path = public as $$
  update usuarios set visto_em = now() where id = auth.uid()
$$;
revoke execute on function public.marcar_acesso() from anon, public;
grant execute on function public.marcar_acesso() to authenticated;

-- =====================================================================
-- 2. Painel do administrador (só para quem está na tabela admins)
-- =====================================================================
create table if not exists public.admins (
  usuario_id uuid primary key references public.usuarios (id) on delete cascade
);
alter table public.admins enable row level security; -- sem políticas: ninguém lê pela API

insert into public.admins (usuario_id)
select id from public.usuarios where id = '0fe8c7a6-c15a-4ffa-8c32-420c1ad66eda'
on conflict do nothing;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where usuario_id = auth.uid())
$$;
grant execute on function public.eh_admin() to authenticated;

create or replace function public.painel_admin() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then
    raise exception 'Somente o administrador pode ver este painel.';
  end if;
  return jsonb_build_object(
    'online_agora',   (select count(*) from usuarios where visto_em > now() - interval '5 minutes'),
    'hoje',           (select count(*) from usuarios where visto_em >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'),
    'ultimos_7_dias', (select count(*) from usuarios where visto_em > now() - interval '7 days'),
    'ultimos_30_dias',(select count(*) from usuarios where visto_em > now() - interval '30 days'),
    'contas',         (select count(*) from usuarios),
    'contas_novas_7_dias', (select count(*) from usuarios where criado_em > now() - interval '7 days'),
    'jogadores',      (select count(*) from jogadores),
    'times',          (select count(*) from times),
    'jogos',          (select count(*) from jogos),
    'jogos_7_dias',   (select count(*) from jogos where criado_em > now() - interval '7 days'),
    'cadastros_recentes', (
      select coalesce(jsonb_agg(x order by x.criado_em desc), '[]') from (
        select u.nome, u.criado_em, u.visto_em,
               (select count(*) from jogador_responsaveis r where r.usuario_id = u.id and r.status = 'ativo') as jogadores
        from usuarios u order by u.criado_em desc limit 20
      ) x)
  );
end $$;
revoke execute on function public.painel_admin() from anon, public;
grant execute on function public.painel_admin() to authenticated;

-- =====================================================================
-- 3. Excluir campeonato (os jogos dele continuam, como amistosos)
-- =====================================================================
create or replace function public.excluir_campeonato(p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  c campeonatos;
  v_jogos int;
begin
  select * into c from campeonatos where id = p_id;
  if c.id is null then raise exception 'Campeonato não encontrado.'; end if;
  if not (c.criado_por = auth.uid() or public.eh_dono_time(c.time_id) or public.eh_familia_do_time(c.time_id)) then
    raise exception 'Você não pode excluir este campeonato.';
  end if;
  update jogos set tipo = 'amistoso', campeonato_id = null, fase = null where campeonato_id = c.id;
  get diagnostics v_jogos = row_count;
  delete from campeonatos where id = c.id;
  return v_jogos;
end $$;
revoke execute on function public.excluir_campeonato(uuid) from anon, public;
grant execute on function public.excluir_campeonato(uuid) to authenticated;
