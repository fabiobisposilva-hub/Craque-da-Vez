-- Craque da Vez: escalação do jogo e colegas do elenco (quem joga junto mas não tem conta no app).
-- Pode rodar mais de uma vez.

-- Escalação de cada jogo: [{ "nome": "João", "posicao": "Pivô", "numero": 9, "titular": true }]
alter table public.jogos add column if not exists escalacao jsonb not null default '[]';

-- Colegas do time, para reaparecerem prontos nos próximos jogos
create table if not exists public.time_colegas (
  id uuid primary key default gen_random_uuid(),
  time_id uuid not null references public.times (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  posicao text,
  numero int check (numero between 0 and 99),
  criado_por uuid not null default auth.uid() references public.usuarios (id),
  criado_em timestamptz not null default now()
);
create unique index if not exists time_colegas_nome on public.time_colegas (time_id, lower(trim(nome)));
alter table public.time_colegas enable row level security;

-- Quem vê o time vê os colegas; quem lança jogos do time (dono ou família que edita) cadastra
drop policy if exists "ver colegas" on public.time_colegas;
create policy "ver colegas" on public.time_colegas for select using (public.pode_ver_time(time_id));
drop policy if exists "cadastrar colega" on public.time_colegas;
create policy "cadastrar colega" on public.time_colegas for insert
  with check (criado_por = auth.uid() and (public.eh_dono_time(time_id) or public.eh_familia_do_time(time_id)));
drop policy if exists "editar colega" on public.time_colegas;
create policy "editar colega" on public.time_colegas for update
  using (public.eh_dono_time(time_id) or public.eh_familia_do_time(time_id));
drop policy if exists "remover colega" on public.time_colegas;
create policy "remover colega" on public.time_colegas for delete
  using (public.eh_dono_time(time_id) or public.eh_familia_do_time(time_id));
grant select, insert, update, delete on public.time_colegas to authenticated;
