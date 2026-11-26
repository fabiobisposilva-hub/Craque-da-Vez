-- Craque da Vez: disputa de pênaltis e cidade do jogador. Pode rodar mais de uma vez.

-- Pênaltis: o placar do tempo normal continua em gols_pro/gols_contra (resultado = empate);
-- a disputa decide quem avança.
-- cobrancas: [{ "lado": "nos"|"eles", "nome": "Miguel", "jogador_id": "...", "resultado": "gol"|"defendido"|"fora" }]
alter table public.jogos add column if not exists penaltis boolean not null default false;
alter table public.jogos add column if not exists penaltis_pro int check (penaltis_pro >= 0);
alter table public.jogos add column if not exists penaltis_contra int check (penaltis_contra >= 0);
alter table public.jogos add column if not exists cobrancas jsonb not null default '[]';
alter table public.jogos add column if not exists goleiro_penaltis text;

-- Cidade do jogador (o app roda no Brasil todo)
alter table public.jogadores add column if not exists cidade text check (cidade is null or length(cidade) <= 60);
alter table public.jogadores add column if not exists uf text check (uf is null or uf ~ '^[A-Z]{2}$');
