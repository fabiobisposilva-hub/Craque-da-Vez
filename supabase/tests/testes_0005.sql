\set ON_ERROR_STOP 1
-- Vovó: convidada só para ver
reset role;
insert into auth.users values ('00000000-0000-0000-0000-0000000000b0','vovo@x.com','{"nome":"Vovó","data_nascimento":"1955-01-01"}');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
insert into convites_responsavel (codigo, jogador_id, papel) values ('VOVO0001','10000000-0000-0000-0000-000000000001','leitor');

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b0';
select aceitar_convite('VOVO0001','avo_f') is not null as vovo_entrou;
select count(*) = 1 as vovo_ve_miguel from jogadores where nome = 'Miguel';
select count(*) >= 1 as vovo_ve_jogos from jogos;
select count(*) >= 1 as vovo_ve_participacoes from jogo_participacoes;
update jogadores set apelido = 'hack' where nome = 'Miguel';
select apelido is distinct from 'hack' as vovo_nao_edita from jogadores where nome = 'Miguel';
do $$ begin
  perform lancar_jogo('{"time_id":"20000000-0000-0000-0000-000000000001","categoria":"Sub-10","data_hora":"2026-11-21T10:00:00-03","adversario":"X"}', '[]');
  raise exception 'FALHOU: vovó lançou jogo';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok vovó não lança: %', sqlerrm; end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('fotos', '10000000-0000-0000-0000-000000000001/foto.jpg');
  raise exception 'FALHOU: vovó enviou foto';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok vovó não envia foto'; end $$;

-- Pai: edita e exclui jogo, envia foto e escudo
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
insert into storage.objects (bucket_id, name) values ('fotos', '10000000-0000-0000-0000-000000000001/foto.jpg');
insert into storage.objects (bucket_id, name) values ('escudos', '00000000-0000-0000-0000-00000000000f/minas.png');
select editar_jogo(id, '{"categoria":"Sub-11","data_hora":"2026-11-14T10:00:00-03","adversario":"Cruzeiro","gols_pro":5,"gols_contra":1,"resumo":"Golaço de falta"}',
  '[{"jogador_id":"10000000-0000-0000-0000-000000000001","gols":3,"observacao":"falta no ângulo"}]') is not null as pai_editou
  from jogos where adversario = 'Cruzeiro';
select categoria, gols_pro, resumo, (select gols from jogo_participacoes p where p.jogo_id = jogos.id) as gols_miguel from jogos where adversario = 'Cruzeiro';
insert into adversarios (nome, escudo_url) values ('Cruzeiro', 'https://x/escudo.png') returning nome;
delete from jogos where adversario = 'Cruzeiro' returning 'pai excluiu' as ok;

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b0';
select count(*) as vovo_ve_vovo from jogador_responsaveis where papel = 'leitor';
