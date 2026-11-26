\set ON_ERROR_STOP 1
reset role;
insert into auth.users values ('0fe8c7a6-c15a-4ffa-8c32-420c1ad66eda','admin@x.com','{"nome":"Admin","data_nascimento":"1985-01-01","telefone":"(61) 99999-0000","aceitou_termos":"true"}');
insert into public.admins values ('0fe8c7a6-c15a-4ffa-8c32-420c1ad66eda') on conflict do nothing;
select telefone, termos_aceitos_em is not null as aceitou from usuarios where id = '0fe8c7a6-c15a-4ffa-8c32-420c1ad66eda';
set role authenticated;
set request.jwt.claim.sub = '0fe8c7a6-c15a-4ffa-8c32-420c1ad66eda';
select marcar_acesso();
select (painel_admin() ->> 'online_agora')::int >= 1 as admin_ve_painel, painel_admin() ->> 'contas' as contas;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
do $$ begin perform painel_admin(); raise exception 'FALHOU: não admin viu painel';
exception when others then if sqlerrm like 'FALHOU%' then raise; end if; raise notice 'ok não admin bloqueado'; end $$;
-- Excluir campeonato com jogo vira amistoso
insert into campeonatos (id, time_id, nome) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Copa Teste');
select lancar_jogo('{"time_id":"20000000-0000-0000-0000-000000000001","categoria":"Sub-10","data_hora":"2026-11-10T10:00:00-03","adversario":"Y","tipo":"campeonato","campeonato_id":"30000000-0000-0000-0000-000000000001","fase":"final","gols_pro":1}', '[]') is not null as lancou;
select excluir_campeonato('30000000-0000-0000-0000-000000000001') as jogos_viraram_amistoso;
select tipo, campeonato_id is null as sem_camp from jogos where adversario = 'Y';
