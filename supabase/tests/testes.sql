\set ON_ERROR_STOP 1
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Usuários: Fabio (pai), Ana (mãe), Técnico da Magnus
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000f','fabio@x.com','{"nome":"Fabio","data_nascimento":"1985-03-10"}'),
 ('00000000-0000-0000-0000-00000000000a','ana@x.com','{"nome":"Ana","data_nascimento":"1987-06-01"}'),
 ('00000000-0000-0000-0000-00000000000c','tec@x.com','{"nome":"Técnico","data_nascimento":"1980-01-01"}');

-- Menor de 18 não cria conta
do $$ begin
  insert into auth.users values ('00000000-0000-0000-0000-000000000017','kid@x.com', jsonb_build_object('nome','Kid','data_nascimento', (current_date - interval '17 years')::date));
  raise exception 'FALHOU: menor criou conta';
exception when others then
  if sqlerrm like 'FALHOU%' then raise; end if;
  raise notice 'ok: menor bloqueado (%)', sqlerrm;
end $$;

select categoria_natural('2016-05-03', 2026) = 'Sub-10' as sub10,
       pode_jogar_idade('2016-05-03','Sub-9',2026) = false as nao_abaixo,
       pode_jogar_idade('2016-05-03','Sub-12',2026) as acima,
       pode_jogar_idade('1988-01-01','Veterano',2026) = false as adulto_nao_mais_velha;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
insert into jogadores (id, nome, data_nascimento, perna_dominante) values
  ('10000000-0000-0000-0000-000000000001','Miguel','2016-05-03','direita');
select count(*) = 1 as fabio_eh_titular from jogador_responsaveis where jogador_id = '10000000-0000-0000-0000-000000000001';
insert into times (id, nome, modalidade) values ('20000000-0000-0000-0000-000000000001','Minas','campo');
insert into jogador_times (jogador_id, time_id, posicao, numero_camisa) values
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','atacante',9);
select lancar_jogo('{"time_id":"20000000-0000-0000-0000-000000000001","categoria":"Sub-10","data_hora":"2026-11-14T10:00:00-03","adversario":"Cruzeiro","gols_pro":3,"gols_contra":1}',
  '[{"jogador_id":"10000000-0000-0000-0000-000000000001","gols":2,"assistencias":1,"craque_do_jogo":true}]') is not null as jogo_lancado;

-- Sub-9 bloqueado
do $$ begin
  perform lancar_jogo('{"time_id":"20000000-0000-0000-0000-000000000001","categoria":"Sub-9","data_hora":"2026-11-15T10:00:00-03","adversario":"X"}',
    '[{"jogador_id":"10000000-0000-0000-0000-000000000001"}]');
  raise exception 'FALHOU: jogou abaixo';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok: %', sqlerrm; end $$;

insert into convites_responsavel (codigo, jogador_id) values ('ABC12345','10000000-0000-0000-0000-000000000001');

-- Ana não vê o Miguel antes do convite
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select count(*) = 0 as ana_nao_ve from jogadores;
select aceitar_convite('abc12345') is not null as ana_aceitou;
select count(*) = 1 as ana_ve, (select count(*) from jogos) = 1 as ana_ve_jogo from jogadores;

-- Técnico: time da Magnus (futsal), convida Miguel; responsável aprova
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select count(*) = 0 as tecnico_nao_ve_miguel from jogadores;
insert into times (id, nome, modalidade, tipo) values ('20000000-0000-0000-0000-000000000002','Magnus','futsal','tecnico');
insert into time_categorias values ('20000000-0000-0000-0000-000000000002','Sub-10');
insert into jogador_times (jogador_id, time_id, status, posicao) values
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','convidado','ala esquerda');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
update jogador_times set status = 'ativo', aprovado_por_responsavel = auth.uid()
 where time_id = '20000000-0000-0000-0000-000000000002';
-- Fabio lança o jogo de sábado antes do técnico
select lancar_jogo('{"time_id":"20000000-0000-0000-0000-000000000002","categoria":"Sub-10","data_hora":"2026-11-15T09:00:00-03","adversario":"Tigres","gols_pro":4,"gols_contra":2}',
  '[{"jogador_id":"10000000-0000-0000-0000-000000000001","gols":3}]') is not null as pai_lancou;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select lancar_jogo('{"time_id":"20000000-0000-0000-0000-000000000002","categoria":"Sub-10","data_hora":"2026-11-15T09:30:00-03","adversario":"Tigres","gols_pro":4,"gols_contra":2}',
  '[{"jogador_id":"10000000-0000-0000-0000-000000000001","gols":2,"assistencias":1}]') is not null as tecnico_lancou;
select count(*) = 1 as tecnico_ve_so_jogos_do_time from jogos where time_id = '20000000-0000-0000-0000-000000000002' and origem = 'tecnico';
select count(*) = 0 as tecnico_nao_ve_minas from jogos where time_id = '20000000-0000-0000-0000-000000000001';

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
select tipo, payload->>'jogador' as jogador, payload->>'gols' as gols from notificacoes order by tipo;
select origem, oficial, substituido_por is not null as substituido from jogos where time_id = '20000000-0000-0000-0000-000000000002' order by origem;
select nome, categoria, jogos, gols, assistencias, foto_url from perfil_publico;

-- 5º responsável é barrado
reset role;
insert into auth.users select gen_random_uuid(), 'r'||g||'@x.com', '{"nome":"R","data_nascimento":"1980-01-01"}' from generate_series(1,3) g;
do $$ begin
  insert into jogador_responsaveis (jogador_id, usuario_id)
    select '10000000-0000-0000-0000-000000000001', id from usuarios where nome = 'R';
  raise exception 'FALHOU: 5 responsáveis';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok: %', sqlerrm; end $$;

-- Família entra no time do técnico com o código do time
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into times (id, nome, modalidade, tipo, codigo) values ('20000000-0000-0000-0000-000000000003','Magnus Campo','campo','tecnico','MAG123');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
select entrar_no_time('mag123', '10000000-0000-0000-0000-000000000001', 'Atacante', 9) = '20000000-0000-0000-0000-000000000003' as entrou_com_codigo;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select count(*) = 1 as tecnico_ve_atleta_do_elenco from jogadores;

-- Cadastro como o app faz: insert ... returning
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into jogadores (nome, data_nascimento) values ('Irmã do Miguel','2019-02-01') returning nome;
insert into times (nome, modalidade) values ('Time da Ana','society') returning nome;
