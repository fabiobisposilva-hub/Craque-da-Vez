import { jogouAcima } from './categorias';
import type { Jogo, Participacao } from './tipos';

export interface Linha {
  jogo: Jogo;
  part: Participacao;
}

export interface Resumo {
  jogos: number;
  gols: number;
  assistencias: number;
  cartoes: number;
  media: number;
  v: number;
  e: number;
  d: number;
  aproveitamento: number;
  maiorSequencia: number;
  craque: number;
  acima: { gols: number; jogos: number; categorias: string[] };
  porMes: { mes: string; gols: number }[];
}

/** Junta jogos e participações de um jogador, ignorando os substituídos pela versão do técnico e os futuros. */
export function linhasDoJogador(jogos: Jogo[], parts: Participacao[], jogadorId: string, agora = new Date()): Linha[] {
  const porId = new Map(jogos.map((j) => [j.id, j]));
  return parts
    .filter((p) => p.jogador_id === jogadorId)
    .map((part) => ({ jogo: porId.get(part.jogo_id)!, part }))
    .filter((l) => l.jogo && !l.jogo.substituido_por && new Date(l.jogo.data_hora) <= agora)
    .sort((a, b) => a.jogo.data_hora.localeCompare(b.jogo.data_hora));
}

export function resumir(linhas: Linha[], nascimento: string): Resumo {
  let gols = 0, assistencias = 0, cartoes = 0, v = 0, e = 0, d = 0, seq = 0, maiorSequencia = 0, craque = 0;
  const acima = { gols: 0, jogos: 0, categorias: new Set<string>() };
  const meses = new Map<string, number>();
  for (const { jogo, part } of linhas) {
    gols += part.gols;
    assistencias += part.assistencias;
    cartoes += part.amarelos + (part.vermelho ? 1 : 0);
    if (part.craque_do_jogo) craque++;
    if (jogo.resultado === 'V') v++;
    else if (jogo.resultado === 'E') e++;
    else d++;
    seq = part.gols > 0 ? seq + 1 : 0;
    maiorSequencia = Math.max(maiorSequencia, seq);
    const temporada = Number(jogo.data_hora.slice(0, 4));
    if (jogouAcima(nascimento, jogo.categoria, temporada)) {
      acima.jogos++;
      acima.gols += part.gols;
      acima.categorias.add(jogo.categoria);
    }
    const mes = jogo.data_hora.slice(0, 7);
    meses.set(mes, (meses.get(mes) ?? 0) + part.gols);
  }
  const n = linhas.length;
  return {
    jogos: n,
    gols,
    assistencias,
    cartoes,
    media: n ? gols / n : 0,
    v,
    e,
    d,
    aproveitamento: n ? Math.round(((v * 3 + e) / (n * 3)) * 100) : 0,
    maiorSequencia,
    craque,
    acima: { ...acima, categorias: [...acima.categorias].sort() },
    porMes: [...meses].map(([mes, g]) => ({ mes, gols: g })),
  };
}
