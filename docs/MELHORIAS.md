# Craque da Vez — melhorias anotadas

Lista do que foi pedido: o que falta e o que já foi feito. Atualizada em 27/11/2026.

## Próxima rodada (anotado em 27/11 — rodar só quando o Fábio pedir)

### 12. Tela do time: caixas de escolha desproporcionais (prints de 27/11)
- **Elenco → "Categoria neste time"**: a caixa "Automática (pelo ano do jogo)" está grande demais e fica **por cima do texto** ("Categoria neste time" aparece cortado atrás dela). Deixar a caixa menor e colocá-la **abaixo** do texto (ou texto em cima, caixa embaixo), sem sobrepor nada.
- **Campeonatos → "🏆 Campeão" + "Excluir"**: mesmo problema. A caixa de resultado e o botão Excluir espremem o nome do campeonato ("Copa do Mundo de futsal 2026 · Sub-10" sai quebrado uma palavra por linha e cortado). Nome em cima, ocupando a linha toda; caixa (menor) e Excluir embaixo.
- Revisar as outras caixas de escolha do app para o mesmo tamanho proporcional.

### 13. "Últimos jogos do time" com os escudos
- Na tela do time, cada linha de "Últimos jogos do time" hoje mostra só a letra V/E/D e o nome do adversário.
- Passar a mostrar **os dois escudos** (nosso time × adversário) com o placar, igual à lista de jogos do atleta (item 6), mantendo a cor de V/E/D.

### 14. Foto do atleta no topo da tela do jogador (print de 27/11, atleta Rafinha)
- A foto redonda não preenche o círculo todo: sobra **borda/espaço sem foto** (aparece um pedaço vazio e um selo cortado no canto de baixo).
- Fazer a foto **preencher o círculo inteiro** (cortar o excesso, sem esticar) e **centralizar melhor** o rosto.
- Ao escolher a foto, deixar a pessoa **ajustar o enquadramento** (arrastar e aproximar) antes de salvar, para o rosto ficar no meio.
- Conferir também a foto da capa e os avatares menores (Início, Elenco, Família) com a mesma regra.

### 15. Cadastro rápido (mais simples) — decidido com o Fábio em 27/11
**Criar conta (o responsável):**
- Só **nome, telefone (do responsável), e-mail e senha** + **um toque para aceitar os Termos e a Política** (e confirmar que tem 18 anos ou mais).

**Cadastrar o atleta:**
- Só **nome, apelido e data de nascimento** — a categoria (sub) sai sozinha pelo ano, na hora, rápido e simples.
- Logo abaixo, o **termo para o pai/mãe concordar** (autorização do responsável legal para os dados do menor), em linguagem simples, com uma caixa para marcar. Sem marcar, não salva.
- Foto, perna dominante, linha/goleiro e times ficam **opcionais**, para completar depois em "✏️ Editar" (o app lembra com um aviso "Complete o perfil").
  - Atenção: hoje "linha ou goleiro" é obrigatório; passa a ser opcional (padrão: linha) até o pai escolher.

**Lei (LGPD art. 14 e ECA Digital) — manter tudo:**
- Consentimento específico e destacado do responsável para dados de menor, guardado com data, versão do termo e quem aceitou (tabela `consentimentos`).
- Coletar só o necessário (por isso o cadastro curto); nada de telefone, e-mail ou cidade do menor.
- Perfil do menor começa privado (só família); foto só para a família; o responsável pode revogar e excluir a qualquer momento.
- Telefone é **só do responsável** e só o administrador vê (suporte).

### 16. Campeonatos: tocar no campeonato abre os jogos dele (print de 27/11, tela do time)
- Na lista **Campeonatos** do time (ex.: "Copa Integração 2026 · Sub-10", "Copa do Mundo de futsal 2026 · Sub-10"), **tocar no nome do campeonato** abre o **histórico de jogos só daquele campeonato**, como um filtro.
  - Mostrar no topo: nome, temporada, sub, situação (Em andamento / 🏆 Campeão…) e o resumo do campeonato (jogos, V/E/D, gols pró e contra, artilheiro do time no campeonato).
  - Lista dos jogos do campeonato com **os dois escudos** e o placar (igual ao item 13), por fase quando houver.
  - Botão para voltar a ver todos os jogos.
- **Escudos não aparecem** nessa tela: aplicar o item 13 também aqui (lista de campeonatos pode ter o escudo do time ao lado do nome).
- **Ajustar os ícones/botões** do cartão do campeonato: a caixa "Em andamento / 🏆 Campeão" e o botão "🗑️ Excluir" estão grandes e por cima do nome (mesmo problema do item 12). Nome inteiro em cima; embaixo, caixa menor e Excluir como ícone pequeno (🗑️), com confirmação.

## Ainda falta (depende de serviço pago / e-mail próprio)

### 10. Confirmar o e-mail com código
- Hoje a confirmação é por **link** no e-mail (já ligada). O **código de 6 números** precisa de envio de e-mail próprio (SMTP: Gmail com senha de app, Resend etc.). Fica para quando o app começar a cobrar.

### 11b. E-mail para o Fábio quando chega conta nova
- A liberação já funciona **dentro do app** (Painel do administrador → Aguardando). O **aviso por e-mail** para o Fábio e para a pessoa liberada depende do mesmo envio de e-mail do item 10.

### A decidir
- Notificar o pai/atleta quando chega curtida ou comentário (hoje não notifica).
- Onde os outros usuários veem o perfil público (ranking do time? busca?).

## Feito em 27/11/2026 (rodada de melhorias)
1. **Curtidas e comentários** na partida e nos gols de cada atleta, só a família do atleta vê; quem escreveu apaga o seu, quem cadastrou apaga qualquer um.
2. **Rodapé** sem "Criado em 2026" e com botão "Fale conosco no WhatsApp" (sem número na tela).
3. **Início** sem botão de papel de parede, com a logo como marca-d'água. Papel de parede só na tela do jogador.
4. **Linha ou goleiro** no cadastro; no lançamento, quadro do goleiro (gols sofridos, defesas, defesas difíceis com relato, pênaltis defendidos); estatísticas próprias do goleiro.
5. **Treino e pelada** fora das estatísticas oficiais, mostrados à parte.
6. **Dois escudos** na lista de jogos do atleta (nosso time × adversário, placar no meio).
7. **Tudo a partir do jogador escolhido**: Agenda, Times e + valem para o jogador ativo, com "trocar jogador".
8. **Painel do administrador completo**: todas as pessoas (e-mail, celular, entrou, último uso, atletas que cadastrou, onde é convidada), lista de atletas, busca, "novos desde a última visita" e bolinha no Perfil.
9. **Foto só para a família** e perfil público só com apelido, time e categoria.
11. **Administrador libera cada conta nova** (convidados também): quem não foi liberado vê "Seu cadastro está em análise".

## Já feito recentemente (para referência)
- Reorganização: Início só com jogadores; tela do jogador com seletor de time e abas Resumo · Jogos · Estatísticas; Agenda; Família e acessos no Perfil; lançar jogo simples + "Mais detalhes"; categoria escolhida por quem lança.
- Pênaltis (disputa) contando nos gols; cidade do jogador; excluir time e campeonato; papel de parede por pessoa.
