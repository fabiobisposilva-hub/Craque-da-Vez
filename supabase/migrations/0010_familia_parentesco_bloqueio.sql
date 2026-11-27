-- Craque da Vez: parentesco, convites sem prazo, bloquear e liberar acesso. Pode rodar mais de uma vez.

-- =====================================================================
-- 1. Parentesco e bloqueio
-- =====================================================================
alter table public.jogador_responsaveis add column if not exists parentesco text;
alter table public.jogador_responsaveis drop constraint if exists jogador_responsaveis_parentesco_check;
alter table public.jogador_responsaveis add constraint jogador_responsaveis_parentesco_check check (parentesco is null or parentesco in
  ('pai','mae','avo_m','avo_f','tio','tia','padrinho','madrinha','irmao','irma','primo','prima','padrasto','madrasta','tecnico','amigo','outro'));

alter table public.jogador_responsaveis drop constraint if exists jogador_responsaveis_status_check;
alter table public.jogador_responsaveis add constraint jogador_responsaveis_status_check check (status in ('convidado','ativo','bloqueado'));

-- Pai e mãe: só uma pessoa cada por jogador (entre quem tem acesso liberado)
create unique index if not exists um_pai_uma_mae on public.jogador_responsaveis (jogador_id, parentesco)
  where parentesco in ('pai','mae') and status = 'ativo';

-- Convites não vencem mais por tempo: valem até serem usados ou cancelados
alter table public.convites_responsavel alter column expira_em drop not null;
alter table public.convites_responsavel alter column expira_em drop default;
alter table public.convites_responsavel add column if not exists cancelado boolean not null default false;
update public.convites_responsavel set expira_em = null where usado_por is null;

-- Quem criou o jogador (titular) administra os acessos
create or replace function public.eh_titular(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from jogador_responsaveis
                 where jogador_id = j and usuario_id = auth.uid() and status = 'ativo' and papel = 'titular')
$$;
grant execute on function public.eh_titular(uuid) to authenticated;

-- Remover/alterar acesso agora só pelas funções abaixo (o titular decide)
drop policy if exists "remover responsável" on public.jogador_responsaveis;

-- Só o titular vê e cancela os convites; responsáveis podem gerar
drop policy if exists "cancelar convite" on public.convites_responsavel;
create policy "cancelar convite" on public.convites_responsavel for update
  using (public.eh_titular(jogador_id) or criado_por = auth.uid());

-- =====================================================================
-- 2. Aceitar convite escolhendo o parentesco
-- =====================================================================
drop function if exists public.aceitar_convite(text);
create or replace function public.aceitar_convite(p_codigo text, p_parentesco text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c convites_responsavel;
  atual jogador_responsaveis;
begin
  select * into c from convites_responsavel where codigo = upper(trim(p_codigo)) for update;
  if c.codigo is null or c.usado_por is not null or c.cancelado or (c.expira_em is not null and c.expira_em < now()) then
    raise exception 'Convite inválido, já usado ou cancelado. Peça um novo código ao responsável.';
  end if;
  if p_parentesco is null then
    raise exception 'Escolha o que você é do atleta (pai, mãe, avó, tio…).';
  end if;
  select * into atual from jogador_responsaveis where jogador_id = c.jogador_id and usuario_id = auth.uid();
  if atual.status = 'bloqueado' then
    raise exception 'Seu acesso a este atleta foi bloqueado pelo responsável. Fale com ele para liberar.';
  end if;
  if p_parentesco in ('pai','mae') and exists (
      select 1 from jogador_responsaveis
      where jogador_id = c.jogador_id and parentesco = p_parentesco and status = 'ativo' and usuario_id <> auth.uid()) then
    raise exception 'Este atleta já tem %. Escolha outro parentesco.', case when p_parentesco = 'pai' then 'pai cadastrado' else 'mãe cadastrada' end;
  end if;

  insert into jogador_responsaveis (jogador_id, usuario_id, papel, status, convidado_por, aprovado_por, parentesco)
  values (c.jogador_id, auth.uid(), c.papel, 'ativo', c.criado_por, c.criado_por, p_parentesco)
  on conflict (jogador_id, usuario_id) do update
    set status = 'ativo', parentesco = excluded.parentesco,
        papel = case when jogador_responsaveis.papel = 'leitor' then excluded.papel else jogador_responsaveis.papel end;
  update convites_responsavel set usado_por = auth.uid() where codigo = c.codigo;
  return c.jogador_id;
end $$;
revoke execute on function public.aceitar_convite(text, text) from anon, public;
grant execute on function public.aceitar_convite(text, text) to authenticated;

-- O próprio usuário informa o parentesco dele com o atleta (ex.: o titular)
create or replace function public.definir_parentesco(p_jogador uuid, p_parentesco text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_membro(p_jogador) then raise exception 'Você não acompanha este atleta.'; end if;
  if p_parentesco in ('pai','mae') and exists (
      select 1 from jogador_responsaveis
      where jogador_id = p_jogador and parentesco = p_parentesco and status = 'ativo' and usuario_id <> auth.uid()) then
    raise exception 'Este atleta já tem %.', case when p_parentesco = 'pai' then 'pai cadastrado' else 'mãe cadastrada' end;
  end if;
  update jogador_responsaveis set parentesco = p_parentesco where jogador_id = p_jogador and usuario_id = auth.uid();
end $$;
revoke execute on function public.definir_parentesco(uuid, text) from anon, public;
grant execute on function public.definir_parentesco(uuid, text) to authenticated;

-- =====================================================================
-- 3. Quem acompanha o atleta (para o titular e responsáveis)
-- =====================================================================
create or replace function public.familia_do_jogador(p_jogador uuid) returns table (
  usuario_id uuid, nome text, parentesco text, papel text, status text, visto_em timestamptz, desde timestamptz, sou_eu boolean
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eh_responsavel(p_jogador) then
    raise exception 'Só os responsáveis veem quem acompanha o atleta.';
  end if;
  return query
    select r.usuario_id, u.nome, r.parentesco, r.papel, r.status, u.visto_em, r.criado_em, r.usuario_id = auth.uid()
    from jogador_responsaveis r join usuarios u on u.id = r.usuario_id
    where r.jogador_id = p_jogador
    order by (r.papel = 'titular') desc, (r.status = 'ativo') desc, r.criado_em;
end $$;
revoke execute on function public.familia_do_jogador(uuid) from anon, public;
grant execute on function public.familia_do_jogador(uuid) to authenticated;

-- Titular bloqueia, libera, remove ou muda a permissão de alguém
create or replace function public.alterar_acesso(p_jogador uuid, p_usuario uuid, p_acao text) returns void
language plpgsql security definer set search_path = public as $$
declare r jogador_responsaveis;
begin
  if not public.eh_titular(p_jogador) then
    raise exception 'Só quem cadastrou o atleta pode bloquear ou liberar acessos.';
  end if;
  if p_usuario = auth.uid() then raise exception 'Você não pode alterar o seu próprio acesso.'; end if;
  select * into r from jogador_responsaveis where jogador_id = p_jogador and usuario_id = p_usuario for update;
  if r.usuario_id is null then raise exception 'Pessoa não encontrada.'; end if;

  if p_acao = 'bloquear' then
    update jogador_responsaveis set status = 'bloqueado' where jogador_id = p_jogador and usuario_id = p_usuario;
  elsif p_acao = 'liberar' then
    if r.parentesco in ('pai','mae') and exists (
        select 1 from jogador_responsaveis where jogador_id = p_jogador and parentesco = r.parentesco and status = 'ativo' and usuario_id <> p_usuario) then
      raise exception 'Já existe % com acesso liberado. Bloqueie ou remova antes.', case when r.parentesco = 'pai' then 'pai' else 'mãe' end;
    end if;
    update jogador_responsaveis set status = 'ativo' where jogador_id = p_jogador and usuario_id = p_usuario;
  elsif p_acao = 'remover' then
    delete from jogador_responsaveis where jogador_id = p_jogador and usuario_id = p_usuario;
  elsif p_acao = 'so_ver' then
    update jogador_responsaveis set papel = 'leitor' where jogador_id = p_jogador and usuario_id = p_usuario;
  elsif p_acao = 'pode_editar' then
    update jogador_responsaveis set papel = 'responsavel' where jogador_id = p_jogador and usuario_id = p_usuario;
  else
    raise exception 'Ação desconhecida.';
  end if;
end $$;
revoke execute on function public.alterar_acesso(uuid, uuid, text) from anon, public;
grant execute on function public.alterar_acesso(uuid, uuid, text) to authenticated;
