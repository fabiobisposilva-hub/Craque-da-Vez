\set ON_ERROR_STOP 1
-- Conta nova fica pendente e não cria nada
reset role;
alter table usuarios alter column aprovacao set default 'pendente';
insert into auth.users values ('00000000-0000-0000-0000-0000000000f1','novo@x.com','{"nome":"Novo","data_nascimento":"1980-01-01","aceitou_termos":"true"}');
select aprovacao from usuarios where id = '00000000-0000-0000-0000-0000000000f1';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin insert into jogadores (nome, apelido, data_nascimento) values ('X','X','2015-01-01'); raise exception 'FALHOU pendente criou';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok pendente: %', sqlerrm; end $$;
select minha_aprovacao() as minha;
-- Admin libera
reset role;
insert into auth.users values ('0fe8c7a6-c15a-4ffa-8c32-420c1ad66eda','adm@x.com','{"nome":"Adm","data_nascimento":"1980-01-01","aceitou_termos":"true"}') on conflict do nothing;
insert into admins values ('0fe8c7a6-c15a-4ffa-8c32-420c1ad66eda') on conflict do nothing;
set role authenticated;
set request.jwt.claim.sub = '0fe8c7a6-c15a-4ffa-8c32-420c1ad66eda';
select contar_pendentes() >= 1 as tem_pendente;
select definir_aprovacao('00000000-0000-0000-0000-0000000000f1','liberado');
select jsonb_array_length(painel_admin_completo() -> 'pessoas') >= 2 as painel_lista_pessoas;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
insert into jogadores (nome, apelido, data_nascimento) values ('Liberado Filho','Lib','2015-01-01') returning apelido;
-- Curtidas e comentários: família do Miguel sim, outro pai não
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
select lancar_jogo('{"time_id":"20000000-0000-0000-0000-000000000001","categoria":"Sub-10","data_hora":"2026-11-01T10:00:00-03","adversario":"Curtida FC","tipo":"pelada","gols_pro":2}','[{"jogador_id":"10000000-0000-0000-0000-000000000001","gols":2}]') is not null as pelada_lancada;
insert into curtidas (jogo_id, jogador_id, alvo) select id, '10000000-0000-0000-0000-000000000001', 'gols' from jogos where adversario = 'Curtida FC';
insert into comentarios (jogo_id, jogador_id, alvo, texto) select id, '10000000-0000-0000-0000-000000000001', 'partida', 'Que jogo!' from jogos where adversario = 'Curtida FC';
select jsonb_array_length(interacoes_do_jogo(id) -> 'comentarios') as comentarios_vistos_pelo_pai from jogos where adversario = 'Curtida FC';
update jogo_participacoes set goleiro = true, gols_sofridos = 1, defesas = 7 where jogo_id = (select id from jogos where adversario = 'Curtida FC') returning defesas;
reset role;
select id as jogo_curtida from jogos where adversario = 'Curtida FC' \gset
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select count(*) = 0 as outro_pai_nao_ve_comentarios from comentarios;
select set_config('teste.jogo', :'jogo_curtida', false);
do $$ begin insert into comentarios (jogo_id, jogador_id, alvo, texto) values (current_setting('teste.jogo')::uuid, '10000000-0000-0000-0000-000000000001', 'partida', 'intruso'); raise exception 'FALHOU intruso comentou';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok intruso: %', sqlerrm; end $$;
