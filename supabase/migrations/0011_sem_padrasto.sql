-- Craque da Vez: retira padrasto e madrasta da lista de parentescos.
update public.jogador_responsaveis set parentesco = 'outro' where parentesco in ('padrasto','madrasta');
alter table public.jogador_responsaveis drop constraint if exists jogador_responsaveis_parentesco_check;
alter table public.jogador_responsaveis add constraint jogador_responsaveis_parentesco_check check (parentesco is null or parentesco in
  ('pai','mae','avo_m','avo_f','tio','tia','padrinho','madrinha','irmao','irma','primo','prima','tecnico','amigo','outro'));
