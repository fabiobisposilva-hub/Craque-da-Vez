-- Craque da Vez: cada pessoa escolhe o seu papel de parede (do Início e de cada jogador). Pode rodar mais de uma vez.

create table if not exists public.papeis_de_parede (
  usuario_id uuid not null default auth.uid() references public.usuarios (id) on delete cascade,
  alvo text not null,          -- 'inicio' ou o id do jogador
  caminho text not null,       -- 'papeis/<arquivo>' (pasta da pessoa) ou 'fotos/<arquivo>' (capa antiga)
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, alvo)
);
alter table public.papeis_de_parede enable row level security;
drop policy if exists "meus papéis de parede" on public.papeis_de_parede;
create policy "meus papéis de parede" on public.papeis_de_parede for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
grant select, insert, update, delete on public.papeis_de_parede to authenticated;

-- Pasta privada de cada pessoa: só ela envia e vê
insert into storage.buckets (id, name, public) values ('papeis', 'papeis', false)
  on conflict (id) do update set public = false;
drop policy if exists "papeis: ver" on storage.objects;
create policy "papeis: ver" on storage.objects for select to authenticated
  using (bucket_id = 'papeis' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "papeis: enviar" on storage.objects;
create policy "papeis: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'papeis' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "papeis: trocar" on storage.objects;
create policy "papeis: trocar" on storage.objects for update to authenticated
  using (bucket_id = 'papeis' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "papeis: apagar" on storage.objects;
create policy "papeis: apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'papeis' and (storage.foldername(name))[1] = auth.uid()::text);

-- A capa que já existia vira o papel de parede de quem cadastrou o jogador
insert into public.papeis_de_parede (usuario_id, alvo, caminho)
select j.criado_por, j.id::text, 'fotos/' || j.capa_url
from public.jogadores j
where j.capa_url is not null and j.capa_url not like 'http%'
on conflict do nothing;
