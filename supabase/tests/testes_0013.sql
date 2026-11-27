\set ON_ERROR_STOP 1
-- Técnico com o Miguel no elenco
reset role;
insert into auth.users values ('00000000-0000-0000-0000-0000000000e1','tec2@x.com','{"nome":"Tecnico Dois","data_nascimento":"1980-01-01","aceitou_termos":"true"}');
insert into times (id, nome, modalidade, tipo, dono_id) values ('20000000-0000-0000-0000-0000000000e1','Time do Tec','futsal','tecnico','00000000-0000-0000-0000-0000000000e1');
insert into jogador_times (jogador_id, time_id, status) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000e1','ativo');
insert into storage.objects (bucket_id, name) values ('fotos','10000000-0000-0000-0000-000000000001/foto-teste.jpg');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select count(*) = 0 as tecnico_nao_le_ficha from jogadores;
select count(*) = 0 as tecnico_sem_fotos from storage.objects where bucket_id = 'fotos';
select string_agg(nome || '/' || apelido || '/' || ano_nascimento, ',') as elenco_tecnico from elenco_do_time('20000000-0000-0000-0000-0000000000e1');
-- Perfil público sem nome nem foto
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
select apelido, categoria, times from perfil_publico limit 1;
-- Consentimento com revogação
select registrar_consentimento('10000000-0000-0000-0000-000000000001','acesso_tecnico','aceito','1.1');
select registrar_consentimento('10000000-0000-0000-0000-000000000001','acesso_tecnico','recusado','1.1');
select count(*) filter (where revogado_em is not null) || ' revogado / ' || count(*) filter (where revogado_em is null) || ' ativo' as historico from consentimentos where tipo = 'acesso_tecnico';
-- Menor de 18 e sem aceite são barrados no servidor
reset role;
do $$ begin insert into auth.users values (gen_random_uuid(),'jovem@x.com', jsonb_build_object('nome','J','data_nascimento',(current_date - interval '17 years')::date,'aceitou_termos','true')); raise exception 'FALHOU 18';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok 18+: %', sqlerrm; end $$;
do $$ begin insert into auth.users values (gen_random_uuid(),'semaceite@x.com','{"nome":"S","data_nascimento":"1980-01-01"}'); raise exception 'FALHOU termos';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok termos: %', sqlerrm; end $$;
-- Anon não executa funções
set role anon;
do $$ begin perform eh_membro('10000000-0000-0000-0000-000000000001'); raise exception 'FALHOU anon';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok anon: %', sqlerrm; end $$;
reset role;
-- Excluir conta do técnico
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select excluir_minha_conta();
reset role;
select count(*) = 0 as conta_tecnico_apagada from usuarios where id = '00000000-0000-0000-0000-0000000000e1';
select count(*) = 1 as miguel_continua from jogadores where id = '10000000-0000-0000-0000-000000000001';
