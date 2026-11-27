\set ON_ERROR_STOP 1
reset role;
insert into auth.users values ('00000000-0000-0000-0000-0000000000d1','tia@x.com','{"nome":"Tia","data_nascimento":"1990-01-01","aceitou_termos":"true"}'),
  ('00000000-0000-0000-0000-0000000000d2','mae2@x.com','{"nome":"Outra Mae","data_nascimento":"1990-01-01","aceitou_termos":"true"}');
-- Ana (já responsável) vira mãe
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select definir_parentesco('10000000-0000-0000-0000-000000000001','mae');
-- Pai (titular) gera dois convites sem prazo
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
select definir_parentesco('10000000-0000-0000-0000-000000000001','pai');
insert into convites_responsavel (codigo, jogador_id, papel) values ('TIA00001','10000000-0000-0000-0000-000000000001','leitor'), ('MAE00002','10000000-0000-0000-0000-000000000001','leitor');
select count(*) = 2 as convites_sem_prazo from convites_responsavel where expira_em is null and codigo in ('TIA00001','MAE00002');
-- Tia entra
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
select aceitar_convite('TIA00001','tia') is not null as tia_entrou;
-- Segunda "mãe" é barrada
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d2';
do $$ begin perform aceitar_convite('MAE00002','mae'); raise exception 'FALHOU: segunda mãe';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok: %', sqlerrm; end $$;
-- Pai vê a família e bloqueia a tia
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
select string_agg(nome || ':' || coalesce(parentesco,'-') || ':' || papel || ':' || status, ' | ') as familia from familia_do_jogador('10000000-0000-0000-0000-000000000001');
select alterar_acesso('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000d1','bloquear');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
select count(*) = 0 as tia_bloqueada_nao_ve from jogadores where nome = 'Miguel';
-- Ana (responsável, não titular) não pode bloquear
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin perform alterar_acesso('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000d1','liberar'); raise exception 'FALHOU: não titular liberou';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok: %', sqlerrm; end $$;
-- Pai libera de novo
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
select alterar_acesso('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000d1','liberar');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
select count(*) = 1 as tia_liberada_ve from jogadores where nome = 'Miguel';
