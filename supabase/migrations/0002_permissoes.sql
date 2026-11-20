-- Craque da Vez: permissões de acesso pela API.
-- Projetos novos do Supabase não liberam as tabelas para o app automaticamente.
-- Quem está logado (authenticated) recebe acesso às tabelas; a RLS continua
-- decidindo linha a linha o que cada um vê e edita. Visitantes (anon) não acessam nada.

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.usuarios, public.jogadores, public.jogador_responsaveis, public.convites_responsavel,
  public.seguidores_aprovados, public.times, public.time_categorias, public.jogador_times,
  public.campeonatos, public.jogos, public.jogo_participacoes, public.jogo_fotos, public.notificacoes
to authenticated;

grant select on public.perfil_publico to authenticated;

grant execute on all functions in schema public to authenticated;

-- As funções de ação não devem ser chamadas por quem não está logado
revoke execute on function public.lancar_jogo(jsonb, jsonb) from anon, public;
revoke execute on function public.aceitar_convite(text) from anon, public;
revoke execute on function public.entrar_no_time(text, uuid, text, int) from anon, public;
