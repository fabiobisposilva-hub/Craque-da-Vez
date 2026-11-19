import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Campeonato, Jogador, JogadorTime, Jogo, Participacao, Time } from './tipos';

export interface Dados {
  jogadores: Jogador[];
  times: Time[];
  vinculos: JogadorTime[];
  jogos: Jogo[];
  participacoes: Participacao[];
  campeonatos: Campeonato[];
}

const vazio: Dados = { jogadores: [], times: [], vinculos: [], jogos: [], participacoes: [], campeonatos: [] };

/** Tudo o que o usuário pode ver (a RLS do banco limita). Escala de família e time: cabe numa carga só. */
export async function carregarTudo(): Promise<Dados> {
  const [j, t, v, g, p, c] = await Promise.all([
    supabase.from('jogadores').select('*').order('nome'),
    supabase.from('times').select('*').order('nome'),
    supabase.from('jogador_times').select('*'),
    supabase.from('jogos').select('*').order('data_hora', { ascending: false }),
    supabase.from('jogo_participacoes').select('*'),
    supabase.from('campeonatos').select('*').order('temporada', { ascending: false }),
  ]);
  const erro = j.error ?? t.error ?? v.error ?? g.error ?? p.error ?? c.error;
  if (erro) throw erro;
  return {
    jogadores: j.data as Jogador[],
    times: t.data as Time[],
    vinculos: v.data as JogadorTime[],
    jogos: g.data as Jogo[],
    participacoes: p.data as Participacao[],
    campeonatos: c.data as Campeonato[],
  };
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
