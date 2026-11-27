import { useCallback, useEffect, useState } from 'react';
import { linksDasFotos } from './imagens';
import { supabase } from './supabase';
import type { Adversario, Campeonato, Colega, Jogador, JogadorTime, Jogo, Papel, Participacao, Time } from './tipos';

export interface Dados {
  meuId: string | null;
  jogadores: Jogador[];
  times: Time[];
  vinculos: JogadorTime[];
  jogos: Jogo[];
  participacoes: Participacao[];
  campeonatos: Campeonato[];
  adversarios: Adversario[];
  colegas: Colega[];
  /** Meu papel em cada jogador: titular/responsável editam, leitor só vê. */
  papeis: Record<string, Papel>;
}

const vazio: Dados = { meuId: null, jogadores: [], times: [], vinculos: [], jogos: [], participacoes: [], campeonatos: [], adversarios: [], colegas: [], papeis: {} };

/** Tudo o que o usuário pode ver (a RLS do banco limita). Escala de família e time: cabe numa carga só. */
export async function carregarTudo(): Promise<Dados> {
  const { data: u } = await supabase.auth.getUser();
  const meuId = u.user?.id ?? null;
  const [j, t, v, g, p, c, a, r, k] = await Promise.all([
    supabase.from('jogadores').select('*').order('nome'),
    supabase.from('times').select('*').order('nome'),
    supabase.from('jogador_times').select('*'),
    supabase.from('jogos').select('*').order('data_hora', { ascending: false }),
    supabase.from('jogo_participacoes').select('*'),
    supabase.from('campeonatos').select('*').order('temporada', { ascending: false }),
    supabase.from('adversarios').select('*'),
    supabase.from('jogador_responsaveis').select('jogador_id, papel').eq('usuario_id', meuId ?? '').eq('status', 'ativo'),
    supabase.from('time_colegas').select('*').order('nome'),
  ]);
  const erro = j.error ?? t.error ?? v.error ?? g.error ?? p.error ?? c.error;
  if (erro) throw erro;
  const jogadores = j.data as Jogador[];
  // Técnico: os atletas do elenco dos times dele chegam só com nome, apelido e ano (sem foto, sem data completa)
  const meusTimes = ((t.data ?? []) as Time[]).filter((x) => x.dono_id === meuId);
  for (const tm of meusTimes) {
    const { data: el } = await supabase.rpc('elenco_do_time', { p_time: tm.id });
    for (const e of (el ?? []) as { id: string; nome: string; apelido: string; ano_nascimento: number }[]) {
      if (!jogadores.some((x) => x.id === e.id))
        jogadores.push({ id: e.id, nome: e.nome, apelido: e.apelido, data_nascimento: `${e.ano_nascimento}-01-01`, perna_dominante: null, foto_url: null, capa_url: null, visibilidade: 'aprovados' });
    }
  }
  const links = await linksDasFotos(jogadores.flatMap((x) => [x.foto_url ?? '', x.capa_url ?? '']));
  for (const x of jogadores) {
    x.foto_link = x.foto_url ? (links[x.foto_url] ?? (x.foto_url.startsWith('http') ? x.foto_url : null)) : null;
    x.capa_link = x.capa_url ? (links[x.capa_url] ?? (x.capa_url.startsWith('http') ? x.capa_url : null)) : null;
  }
  const papeis: Record<string, Papel> = {};
  for (const linha of (r.data ?? []) as { jogador_id: string; papel: Papel }[]) papeis[linha.jogador_id] = linha.papel;
  return {
    meuId,
    jogadores,
    times: t.data as Time[],
    vinculos: v.data as JogadorTime[],
    jogos: g.data as Jogo[],
    participacoes: p.data as Participacao[],
    campeonatos: c.data as Campeonato[],
    adversarios: a.error ? [] : (a.data as Adversario[]), // antes do SQL novo a tabela não existe
    colegas: k.error ? [] : (k.data as Colega[]),
    papeis,
  };
}

/** Posso editar este jogador? (família convidada só para ver não pode) */
export function podeEditar(d: Pick<Dados, 'papeis'>, jogadorId: string): boolean {
  const p = d.papeis[jogadorId];
  return p === 'titular' || p === 'responsavel';
}

/** Escudo do adversário pelo nome: o meu primeiro, depois o de qualquer usuário. */
export function escudoDoAdversario(d: Pick<Dados, 'adversarios' | 'meuId'>, nome: string): string | null {
  const n = nome.trim().toLowerCase();
  const iguais = d.adversarios.filter((a) => a.nome.trim().toLowerCase() === n && a.escudo_url);
  return (iguais.find((a) => a.criado_por === d.meuId) ?? iguais[0])?.escudo_url ?? null;
}

export function useDados() {
  const [dados, setDados] = useState<Dados>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const recarregar = useCallback(async () => {
    try {
      setDados(await carregarTudo());
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String((e as { message?: string }).message ?? e));
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => {
    recarregar();
  }, [recarregar]);
  return { ...dados, carregando, erro, recarregar };
}
