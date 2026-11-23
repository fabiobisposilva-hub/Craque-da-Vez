# Craque da Vez

> Hoje o destaque é você.

App de carreira futebolística (base, várzea, semiprofissional e pelada). Especificação completa em
[`docs/CRAQUE-DA-VEZ-documento-completo.md`](docs/CRAQUE-DA-VEZ-documento-completo.md).

**Stack:** React + Vite (PWA mobile-first) na Vercel (https://craquedavez.vercel.app, publica sozinha a cada push na `main`), Supabase (Auth, Postgres, RLS, Storage).

## O que já está pronto (etapas 1 a 6 do documento, mais parte da 7 e da 8)

- **Banco** (`supabase/migrations/0001_init.sql`): todas as tabelas do item 12.2, funções de categoria,
  limite de 4 responsáveis, bloqueio de menores de 18 no cadastro, RLS e a view `perfil_publico`.
- **Cadastro e login** (18+), recuperação de senha.
- **Jogadores**: categoria automática pelo ano, perna, visibilidade (padrão “Só aprovados”), foto pública desligada por padrão.
- **Responsáveis**: convite por código (7 dias, uso único), até 4 por jogador.
- **Times**: particular (família) ou do técnico (com categorias e código do time para as famílias entrarem).
- **Lançar jogo**: time → categoria → tipo/campeonato (com “+ Novo campeonato” e fase) → placar com resultado
  automático → gols, assistências, cartões, suspensão, titular/reserva, craque do jogo e observação por jogador.
  Só aparecem os jogadores elegíveis para a categoria.
- **Modo ao vivo**: botões grandes (gol, assistência, cartão, gol do adversário) com desfazer. Salva como jogo normal.
- **Técnico × responsável**: o lançamento do técnico vale como oficial; o do responsável no mesmo time, categoria e dia
  fica “substituído”, e as diferenças aparecem em Jogos. Notificações para os responsáveis.
- **Estatísticas**: jogos, gols, assistências, cartões, média, V/E/D e aproveitamento, maior sequência marcando,
  gols jogando acima da categoria, gráfico mês a mês, títulos; filtros por time, categoria, campeonato e temporada.
  Para o time: artilharia, garçons e cartões por categoria.

## Falta (próximas etapas)

- Fotos (jogador, capa, jogo) com Storage privado e URLs assinadas (etapa 9)
- Modo ao vivo sincronizado entre aparelhos via Realtime (hoje funciona num aparelho só)
- Seguidores aprovados (tela para aprovar quem vê perfis “Só aprovados”) e busca de perfis públicos
- Service worker (instalação offline do PWA)
- Pendências do documento: idade em que a base termina (hoje **Sub-20**, em `FIM_DA_BASE`, no
  `src/lib/categorias.ts` e em `fim_da_base()` no SQL) e se a base joga no Livre (hoje **sim**)

## Como rodar

1. Crie um projeto no [Supabase](https://supabase.com) e rode `supabase/migrations/0001_init.sql` no **SQL Editor**.
2. Em **Authentication → URL Configuration**, coloque a URL do Netlify (e `http://localhost:5173`) em *Site URL* / *Redirect URLs*.
3. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. O logo (`public/logo.png`) e os ícones (`public/icone.png`, 1024 px, e `public/icone-192.png`) já estão no projeto.
   O ícone é o emblema do logo (jogador, arcos e bola) sem o texto, em fundo azul-marinho.
5. `npm install` e `npm run dev`.

**Netlify:** conecte o repositório, cadastre as duas variáveis `VITE_SUPABASE_*` e publique. O `netlify.toml` já está pronto.

## Testes

- `npm test`: regras de categoria (Miguel, 2016: Sub-10 em 2026, Sub-11 em 2027; base joga acima e nunca abaixo; adultos o inverso).
- `supabase/tests/`: cenários de permissão do banco num Postgres local (`stub_supabase.sql` imita o `auth` do Supabase, depois rode a migração e `testes.sql`).
