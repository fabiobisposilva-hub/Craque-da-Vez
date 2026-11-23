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
