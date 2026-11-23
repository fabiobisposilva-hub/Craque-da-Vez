\set ON_ERROR_STOP 1
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
insert into time_colegas (time_id, nome, posicao, numero) values ('20000000-0000-0000-0000-000000000001','João','Pivô',9) returning nome;
update jogos set escalacao = '[{"nome":"João","posicao":"Pivô","numero":9,"titular":true}]' where time_id = '20000000-0000-0000-0000-000000000001' returning jsonb_array_length(escalacao) as escalados;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b0';
select count(*) = 1 as vovo_ve_colegas from time_colegas;
do $$ begin
  insert into time_colegas (time_id, nome) values ('20000000-0000-0000-0000-000000000001','Hack');
  raise exception 'FALHOU: vovó cadastrou colega';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok vovó não cadastra colega'; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select count(*) = 0 as tecnico_nao_ve_colegas_do_minas from time_colegas;
