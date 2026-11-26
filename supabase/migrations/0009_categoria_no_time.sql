-- Craque da Vez: categoria em que o jogador atua em cada time (padrão ao lançar jogos).
alter table public.jogador_times add column if not exists categoria text;
