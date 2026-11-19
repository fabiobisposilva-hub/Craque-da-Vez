# Craque da Vez: documento completo do projeto

> App de carreira futebolística para jogadores da base, várzea, semiprofissional e pelada.
> Projeto do Fabio com o filho Miguel. Conversa de 17 a 19/11/2026, consolidada para a construção no Claude Code.
> Pasta no Google Drive: **Aplicativo Miguel** (https://drive.google.com/drive/folders/1GuwnbOjkGLyjv7lwWCAyFZlKMfMJhmb_)

---

## 0. Resumo em 10 linhas

1. **Nome:** Craque da Vez. **Slogan:** "Hoje o destaque é você".
2. **Conceito:** o app é **centrado no jogador**. Ele registra a vida futebolística do atleta em todos os times em que joga.
3. **Contas:** só **maiores de 18 anos** criam conta (o "responsável"). Crianças são cadastradas **dentro** da conta do responsável.
4. Cada jogador pode ter até **4 responsáveis** que editam. Cada um edita **só os próprios jogadores**.
5. **Categoria automática** pelo ano de nascimento. Na base, o jogador joga na dele e **acima, nunca abaixo**. Nos adultos (Master 35+, Veterano 40+, Cinquentinha 50+) vale o inverso.
6. **Jogos:** placar, resultado automático, gols, assistências e cartões por jogador, campeonato e fase. Tem também o **modo ao vivo**.
7. **Técnico:** cadastra o time com várias categorias e lança os jogos. O jogo aparece no app do responsável com notificação. **A versão do técnico vale como oficial**.
8. **Privacidade (LGPD, dados de menores):** os outros usuários veem o nome e as estatísticas. A **foto só aparece com autorização** (desligada por padrão).
9. **Visual:** fundo azul-marinho, branco e vermelho como destaque, fonte Montserrat, com o logo do Fabio (jogador em silhueta).
10. **Stack:** versão própria com **Supabase + Netlify** (mesmo caminho do app BeBê a CaMinHo).

---

## 1. Conceito e público

- O app registra a **carreira do jogador**: jogos, gols, assistências, cartões, campeonatos e títulos.
- O público vai da base (crianças, Sub-X) ao adulto (Livre, Master, Veterano, Cinquentinha), incluindo várzea, semiprofissional e peladeiro.
- Um mesmo jogador joga em **vários times**. Exemplo real: o Miguel joga na **Magnus** (futsal, Sub-10) e no **Minas**.
- Uso principal: **celular**. Quem usa é o responsável, a criança (vendo e participando) e os técnicos.

## 2. Usuários, contas e permissões

### 2.1 Responsável (conta principal)
- O primeiro login é sempre de **maior de 18 anos**. O cadastro pede a data de nascimento e bloqueia quem tiver menos de 18.
- O responsável cadastra **um ou mais jogadores**: ele mesmo, se joga, e quantos filhos tiver.
- A criança **não tem conta própria**. Ela existe como jogador dentro da conta do responsável.
- **Até 4 responsáveis por jogador**, que entram por convite (ex.: pai, mãe, avó). O convite precisa de **autorização de quem já é responsável**.
- **Cada um edita somente os próprios jogadores.**

### 2.2 Técnico
- Cadastra o **time dele** com **várias categorias** (ex.: Magnus Sub-9, Sub-10, Sub-11).
- Lança os jogos por categoria: adversário, placar, gols, assistências e cartões de cada atleta.
- Tem a **estatística do time** (artilharia, garçons, cartões e aproveitamento por categoria).
- **Só vê o próprio time.** Não vê os números do atleta em outros times.
- O atleta entra no elenco por **convite do técnico aprovado pelo responsável** (LGPD).
- Os campeonatos cadastrados pelo técnico aparecem automaticamente para os responsáveis.

### 2.3 Regra de conflito técnico × responsável
- Quando o técnico lança um jogo, ele **aparece no app do responsável** com **notificação** (ex.: "O técnico da Magnus lançou o jogo de sábado: Miguel fez 2 gols"). O responsável não precisa lançar de novo.
- Se o responsável e o técnico lançarem o **mesmo jogo** (mesmo time, categoria e data), **a versão do técnico vale como oficial**, e o responsável é **avisado das diferenças**.

### 2.4 Outros usuários
- Veem o **perfil público** do jogador: nome do atleta, categoria e estatísticas.
- Não veem: data de nascimento completa, local e horário de jogos futuros, nem a foto (a menos que esteja autorizada).

## 3. Cadastro do jogador

| Campo | Regra |
|---|---|
| Nome | Obrigatório. Aparece no perfil público |
| Data de nascimento | Obrigatória. Gera a categoria automaticamente |
| Categoria natural | Calculada, não digitada (ver item 4) |
| Categorias em que atua | Editável, só dentro das regras do item 4 |
| Perna dominante | Direita / esquerda / ambidestro |
| Times | Vários |
| Posição | **Por time** (pode jogar de ala no futsal e de atacante no campo) |
| Número da camisa | Por time |
| Foto do jogador | Opcional. Botão "Mostrar foto no perfil público", **desligado por padrão** |
| Capa do perfil | Qualquer foto (o jogador, o escudo etc.), com camada escura por cima para dar legibilidade |
| Visibilidade do perfil | Público / só pessoas aprovadas / privado. **Padrão para menores: só aprovados** |

**Posições:**
- Futsal: goleiro, fixo, ala direita, ala esquerda, pivô
- Campo/society: goleiro, zagueiro, lateral, volante, meia, ponta, atacante

Sem foto autorizada, o perfil público mostra as **iniciais** (e o número da camisa, quando houver).

## 4. Categorias (regra de negócio central)

### 4.1 Cálculo
- Sempre pelo **ano de nascimento** (não pela data exata). A atualização é automática a cada temporada (ano civil).
- `idade_na_temporada = ano_da_temporada − ano_de_nascimento`
- **Base:** categorias de **1 em 1 ano**. `categoria = "Sub-" + idade_na_temporada`
  - Exemplo: Miguel, nascido em **2016**, é **Sub-10** em 2026 e vira **Sub-11** em janeiro de 2027, sozinho.
- **Adultos:**
  - Livre/Adulto: a partir do fim da base
  - **Master 35+**
  - **Veterano 40+**
  - **Cinquentinha 50+**

### 4.2 Elegibilidade (quem pode jogar onde)
- **Base (Sub-X é idade MÁXIMA):** joga na categoria dele **e em qualquer uma acima, sem limite**. **Nunca abaixo.**
  - Miguel (Sub-10): ✅ Sub-10, ✅ Sub-11, ✅ Sub-12… 🚫 Sub-9
- **Adultos (idade MÍNIMA):** joga na dele e nas **mais novas**. Nunca numa mais velha.
  - Cinquentinha joga Veterano, Master e Livre. Quem tem 38 anos joga Master e Livre, mas não Veterano.
- A permissão de jogar acima vale para o jogador em geral.
- Na escalação ou no lançamento do jogo **só aparecem os jogadores elegíveis** para a categoria do jogo.
- Na virada do ano, categorias que ficaram abaixo da natural somem das opções sozinhas. **O histórico fica intacto**: os jogos antigos continuam registrados na categoria em que foram disputados.

### 4.3 Pendente de decisão
- Em que idade termina a base e começa o "Livre" (ex.: Sub-17, Sub-20)?
- O jogador da base pode jogar no "Livre"?

## 5. Times

| Tipo | Quem cria | Quem vê | Quem lança jogos |
|---|---|---|---|
| **Particular** | A família | Só os responsáveis do jogador | O responsável |
| **Do técnico** | O técnico | O técnico e os responsáveis dos atletas do elenco | O técnico (versão oficial) |

Campos: nome, modalidade (futsal / campo / society), escudo (imagem), cor, categorias (para o time do técnico).

## 6. Jogos

### 6.1 Lançamento (fluxo)
1. Escolher o **time**
2. Escolher a **categoria** disputada
3. Escolher o **tipo**: amistoso, treino/coletivo ou **campeonato**
   - Campeonato: lista dos campeonatos do time, com **"+ Novo campeonato"** na mesma tela
   - **Fase:** grupos/classificatória, oitavas, quartas, semifinal, final
4. Data e horário, adversário, local (casa/fora e nome da quadra)
5. **Placar**: o resultado sai **automático** (vitória, empate ou derrota)
6. Por jogador: **gols, assistências, cartões** (amarelo e vermelho, com o vermelho podendo marcar suspensão para o próximo jogo), titular ou reserva, **craque do jogo ⭐** e observação

### 6.2 Modo ao vivo (na quadra)
- Botões grandes e rápidos durante a partida ("⚽ Gol do Miguel", assistência, cartão), com o placar montando em tempo real.
- No fim, o jogo é salvo como um jogo normal.

### 6.3 Foto do jogo
- Botão **"📷 Adicionar foto do jogo"**, com visibilidade: 🔒 só responsáveis (**padrão**), 👥 time (técnico e responsáveis do elenco) ou 🌐 público.
- Se a foto mostrar **outras crianças**, a opção "Público" exibe um aviso.

## 7. Campeonatos

- Campos: nome, ano/temporada, categoria, time, situação (em andamento, campeão 🏆, vice 🥈, eliminado).
- Estatísticas **por campeonato** (ex.: "Copa Brasília 2026: 5 jogos, 6 gols").
- **Galeria de títulos** no perfil.
- Artilharia do campeonato quando o técnico lançar os jogos do time.

## 8. Estatísticas

- Total de jogos, gols, assistências e cartões; média de gols por jogo
- Filtros: **por time, categoria, campeonato e temporada**
- Jogos **acima da categoria** destacados (ex.: "12 gols no Sub-10 e 3 jogando no Sub-11")
- Aproveitamento (V/E/D), maior sequência marcando, gráfico mês a mês
- Para o técnico: artilheiros, garçons, cartões e aproveitamento por categoria

## 9. Privacidade e LGPD (dados de crianças)

- A LGPD exige o consentimento de pelo menos um dos pais para tratar dados de criança. Por isso, todo cadastro e toda autorização de menor passam pelo **responsável**.
- O app pode também perguntar para a criança ("Quer que sua foto apareça?"), com confirmação do responsável.
- Fotos e dados sensíveis **nunca são públicos por padrão**.
- O perfil público é limitado: nome, categoria e estatísticas.
- Dados de jogos futuros (local e horário) **nunca** aparecem para quem não é responsável nem técnico do time.

| Quem | Vê | Edita |
|---|---|---|
| Responsáveis do jogador (até 4) | Tudo | Sim |
| Técnico | Só o que aconteceu no time dele | Os jogos do time (versão oficial) |
| Outros usuários | Nome, categoria e estatísticas (foto só se autorizada) | Não |

## 10. Funcionalidades futuras (em etapas)

- Treinos e presença
- Convocação
- Tabela completa de campeonato com classificação
- Conquistas e medalhas
- Card do jogador para compartilhar no WhatsApp
- Notificações de jogo lançado pelo técnico (essa entra já no início)

---

## 11. Identidade visual

### 11.1 Logo oficial
- Criado pelo Fabio: o jogador em silhueta conduzindo a bola, um arco vermelho e um arco azul-marinho, o texto **"CRAQUE DA VEZ"** e o slogan **"HOJE O DESTAQUE É VOCÊ"**.
- **A escrita original do logo foi mantida** (não trocar a fonte do logo).
- **Versão principal: fundo azul-marinho** (jogador e texto em branco, detalhes em vermelho).
- O logo foi vetorizado (SVG). Os arquivos estão no Drive, em `Aplicativo Miguel/Logo Craque da Vez/`:

| Arquivo | Uso |
|---|---|
| `craque-da-vez-logo-fundo-azul.svg` / `.png` (4000 px) | **Principal**: tela de abertura e fundos escuros |
| `craque-da-vez-logo-fundo-branco.png` | Fundos claros |
| `craque-da-vez-logo.svg` / `.png` | Fundo transparente, versão com cores para fundo claro |
| `craque-da-vez-icone-azul.svg` / `.png` (1024 px) | **Ícone do app** e favicon |
| `craque-da-vez-icone-branco.png` | Ícone em fundo claro |

- Testes de tipografia (dinâmica, moderna, futurística, manuscrita): só **referência**, não usar no logo.

### 11.2 Paleta (decidida: segue o logo)

| Token | Cor | Uso |
|---|---|---|
| `--bg` | `#01162C` | Fundo do app |
| `--surface` | `#0B2340` | Cartões, campos, áreas de destaque |
| `--border` | `#1C3A63` | Bordas e divisores |
| `--text` | `#FFFFFF` | Texto principal |
| `--text-muted` | `#A9B6CC` | Texto secundário |
| `--accent` | `#E8000B` | Botões, ação principal (+ Lançar jogo), avatar, item ativo |
| `--accent-text` | `#FF6B72` | Links e textos pequenos em vermelho sobre o azul (melhor contraste) |

**Cores de significado:**
- Vitória: verde. Empate: cinza. Derrota: vermelho. Cartões: amarelo e vermelho.
- Como o vermelho é também a cor da marca, **derrota e cartão sempre levam ícone ou letra** (V/E/D, desenho do cartão). A cor nunca fica sozinha.

### 11.3 Tipografia da interface
- **Montserrat** (Google Fonts, uso comercial liberado): 500 / 600 / 700 / 800.

### 11.4 Telas já desenhadas
Tela de design no Claude: **"Craque da Vez – telas do app"** (https://claude.ai/artifact/3ditDT6TKQJwUtUok8rnxG)
1. **Abertura:** o logo no centro e uma barra de carregamento vermelha.
2. **Login:** e-mail, senha, "Esqueci minha senha", botão vermelho "Entrar", botão contornado "Criar conta" e o aviso "Só maiores de 18 anos criam conta. Atletas menores são cadastrados pelo responsável".
3. **Perfil do jogador:** capa com o botão "Escolher capa", avatar com iniciais e borda vermelha, selo de privacidade "Só aprovados", nome, categoria e ano, times em etiquetas, 4 números (Jogos, Gols, Assist., Cartões) e um estado vazio com "Lance o primeiro jogo".
   - **Menu inferior:** Início · Jogos · **(+) vermelho no centro** · Times · Perfil

Medidas: tela de celular 390 × 844, botões com 48–52 px de altura, cantos de 12 px, alvos de toque de no mínimo 44 px.

---

## 12. Arquitetura proposta (para o Claude Code)

### 12.1 Stack
- **Front-end:** app web mobile-first (PWA), publicado no **Netlify**.
- **Back-end:** **Supabase** (Auth, Postgres, Storage, Row Level Security, Realtime para o modo ao vivo e as notificações).
- Mesmo caminho já usado no app BeBê a CaMinHo (Supabase + Netlify).

### 12.2 Modelo de dados (rascunho)

```
usuarios (perfil do usuário logado; id = auth.users.id)
  id, nome, data_nascimento (>= 18 anos no cadastro), criado_em

jogadores
  id, nome, data_nascimento, perna_dominante,
  foto_url, foto_publica (bool, default false),
  capa_url, visibilidade ('publico' | 'aprovados' | 'privado'; menor => 'aprovados'),
  criado_por (usuarios.id), criado_em

jogador_responsaveis   -- até 4 por jogador
  jogador_id, usuario_id, papel ('titular' | 'responsavel'),
  status ('convidado' | 'ativo'), convidado_por, aprovado_por, criado_em

seguidores_aprovados   -- quem pode ver perfil "só aprovados"
  jogador_id, usuario_id, aprovado_por, criado_em

times
  id, nome, modalidade ('futsal' | 'campo' | 'society'), escudo_url, cor,
  tipo ('particular' | 'tecnico'), dono_id (usuarios.id), criado_em

time_categorias        -- categorias do time do técnico
  time_id, categoria (ex.: 'Sub-10', 'Master')

jogador_times
  jogador_id, time_id, posicao, numero_camisa,
  status ('convidado' | 'ativo'), aprovado_por_responsavel, criado_em

campeonatos
  id, time_id, nome, temporada (ano), categoria,
  situacao ('andamento' | 'campeao' | 'vice' | 'eliminado'), criado_por

jogos
  id, time_id, categoria, data_hora, adversario,
  tipo ('amistoso' | 'treino' | 'campeonato'), campeonato_id, fase,
  local, casa_fora, gols_pro, gols_contra,
  resultado (calculado: 'V' | 'E' | 'D'),
  origem ('tecnico' | 'responsavel'), oficial (bool),
  lancado_por, ao_vivo (bool), criado_em

jogo_participacoes
  jogo_id, jogador_id, gols, assistencias,
  amarelos, vermelho (bool), suspenso_proximo (bool),
  titular (bool), craque_do_jogo (bool), observacao

jogo_fotos
  id, jogo_id, url, visibilidade ('responsaveis' | 'time' | 'publico'),
  tem_outras_criancas (bool), enviado_por

notificacoes
  id, usuario_id, tipo ('jogo_lancado_tecnico' | 'divergencia' | 'convite' ...),
  payload (json), lida (bool), criado_em
```

### 12.3 Funções/regras no banco
- `categoria_natural(data_nascimento, temporada)`: devolve `Sub-N`, `Livre`, `Master`, `Veterano` ou `Cinquentinha`.
- `pode_jogar(jogador_id, categoria, temporada)`: aplica a regra do item 4.2 (base: igual ou acima; adultos: igual ou mais nova).
- Gatilho em `jogos`: quando a origem é `tecnico`, marca como oficial, procura um jogo do responsável no mesmo time, categoria e data, avisa as diferenças e cria as notificações.
- Gatilho em `jogador_responsaveis`: impede mais de 4 responsáveis ativos por jogador.
- Cadastro de usuário: rejeita quem tiver menos de 18 anos.

### 12.4 Segurança (RLS)
- `jogadores`, `jogo_participacoes`, `jogo_fotos`: **escrita só por responsáveis ativos** do jogador (e pelo técnico, nos jogos do time dele).
- Leitura pública **limitada a uma view** com nome, categoria e estatísticas. Nunca expor `data_nascimento` completa, `foto_url` sem `foto_publica = true` nem jogos futuros.
- Técnico lê só os dados de `jogos` e `jogo_participacoes` do **time dele**.
- Storage: buckets privados para fotos e capas, com URLs assinadas. A foto pública só sai quando `foto_publica = true`.

### 12.5 Ordem sugerida de construção
1. Supabase: projeto, tabelas, funções de categoria, RLS
2. Auth: cadastro (18+), login, recuperação de senha
3. Cadastro de jogadores e responsáveis (convite, limite de 4)
4. Times particulares e vínculo jogador × time
5. Lançamento de jogo (normal) e estatísticas do perfil
6. Campeonatos
7. Técnico: time, categorias, convite ao atleta, lançamento oficial, notificações e regra de conflito
8. Modo ao vivo (Realtime)
9. Fotos (jogador, capa, jogo) com as regras de privacidade
10. Publicação no Netlify (PWA com o ícone do app)

---

## 13. Pendências

- [ ] Em que idade termina a base e começa o "Livre"? O jogador da base pode jogar no Livre?
- [ ] Verificar se o nome "Craque da Vez" já existe na Play Store e na App Store
- [ ] Desenhar as telas: lançar jogo (normal e ao vivo), lista de jogos, times, campeonatos e área do técnico
- [ ] Definir se vai para as lojas (Play Store/App Store) ou fica como PWA no início
- [ ] Ajuste opcional do logo: o "É" e o "Ê" do slogan estão com traço mais fino que as outras letras (vem do arquivo original)

## 14. Histórico de decisões (resumo cronológico)

- **17/11:** ideia do app de futebol; cadastro do jogador (nome, nascimento, times, posição, perna, categoria automática); jogos com gols, assistências e cartões; vários jogadores por conta.
- **17/11:** categorias de 1 em 1 ano (Miguel, nascido em 2016, é Sub-10); jogar acima sim, abaixo não, sem limite pra cima; caminho técnico Supabase + Netlify.
- **17/11:** conta só para maiores de 18; responsável cadastra os filhos; app centrado no jogador (Minas e Magnus); modo ao vivo aprovado; todas as ideias extras aprovadas; adultos Master 35+, Veterano 40+, Cinquentinha 50+; até 4 responsáveis; técnico com várias categorias e estatística do time; capa do perfil por jogador.
- **19/11:** campeonato escolhido no próprio lançamento do jogo; modelo de privacidade aprovado (nome público, foto só com autorização, botão no perfil e no jogo); conflito resolvido com a versão do técnico como oficial e aviso ao responsável.
- **19/11:** nomes finalistas Tabelinha e Craque da Vez → **Craque da Vez**; testes de logo (ilustração, foto gerada, logos gerados) descartados; **logo do Fabio adotado**, vetorizado, com a escrita original e a versão em fundo azul-marinho como principal; paleta do app passa a seguir o logo (azul-marinho, branco, vermelho); primeiras telas desenhadas.

## 15. Onde está cada coisa

| Item | Local |
|---|---|
| Pasta do projeto | Google Drive → Aplicativo Miguel |
| Este documento | Google Drive → Aplicativo Miguel → `CRAQUE-DA-VEZ-documento-completo.md` |
| Especificação resumida | Google Drive → Aplicativo Miguel → `especificacao-app-futebol.md` (versão anterior: `-v1`) |
| Logos e ícones (SVG e PNG) | Google Drive → Aplicativo Miguel → Logo Craque da Vez |
| Testes de tipografia | Mesma subpasta (`comparativo-*.png`, `tipografia-*.png`, `manuscrito-*`, `virtual-*`) |
| Foto gerada (descartada como logo) | Google Drive → Aplicativo Miguel → `logo-craque-da-vez.jpg` |
| Telas do app | Claude → tela de design "Craque da Vez – telas do app" |
