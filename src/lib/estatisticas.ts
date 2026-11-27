import { jogouAcima } from './categorias';
import { ehOficial, type Jogo, type Participacao } from './tipos';

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
  /** Gols convertidos em disputas de pênaltis (já somados em gols). */
  golsPenaltis: number;
  acima: { gols: number; jogos: number; categorias: string[] };
  porMes: { mes: string; gols: number }[];
  /** Treinos e peladas: contados à parte, fora dos números oficiais. */
  extras: { jogos: number; gols: number; assistencias: number };
  /** Números de goleiro (jogos em que ele jogou no gol). */
  goleiro: { jogos: number; golsSofridos: number; media: number; semSofrer: number; defesas: number; mediaDefesas: number; dificeis: number; penaltisDefendidos: number; vitorias: number };
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

/** Gols que o jogador converteu na disputa de pênaltis deste jogo. */
export function golsNaDisputa(jogo: Pick<Jogo, 'cobrancas' | 'penaltis'>, jogadorId: string): number {
  if (!jogo.penaltis) return 0;
  return (jogo.cobrancas ?? []).filter((c) => c.lado === 'nos' && c.jogador_id === jogadorId && c.resultado === 'gol').length;
}

/** Gols do jogador no jogo, contando os da disputa de pênaltis. */
export function golsDoJogador(jogo: Pick<Jogo, 'cobrancas' | 'penaltis'>, part: Pick<Participacao, 'gols' | 'jogador_id'>): number {
  return part.gols + golsNaDisputa(jogo, part.jogador_id);
}

/** Defesas de pênalti na disputa: cobranças do adversário defendidas com este atleta no gol. */
export function defesasNaDisputa(jogo: Pick<Jogo, 'cobrancas' | 'penaltis' | 'goleiro_penaltis'>, nomes: string[]): number {
  if (!jogo.penaltis || !jogo.goleiro_penaltis) return 0;
  const g = jogo.goleiro_penaltis.trim().toLowerCase();
  if (!nomes.some((n) => n && n.trim().toLowerCase() === g)) return 0;
  return (jogo.cobrancas ?? []).filter((c) => c.lado === 'eles' && c.resultado === 'defendido').length;
}

export function resumir(todas: Linha[], nascimento: string, nomesGoleiro: string[] = []): Resumo {
  const linhas = todas.filter((l) => ehOficial(l.jogo));
  const extrasL = todas.filter((l) => !ehOficial(l.jogo));
  const extras = {
    jogos: extrasL.length,
    gols: extrasL.reduce((t, l) => t + golsDoJogador(l.jogo, l.part), 0),
    assistencias: extrasL.reduce((t, l) => t + l.part.assistencias, 0),
  };
  const gl = linhas.filter((l) => l.part.goleiro);
  const golsSofridos = gl.reduce((t, l) => t + (l.part.gols_sofridos ?? l.jogo.gols_contra), 0);
  const defesasG = gl.reduce((t, l) => t + (l.part.defesas ?? 0), 0);
  const goleiro = {
    jogos: gl.length,
    golsSofridos,
    media: gl.length ? golsSofridos / gl.length : 0,
    semSofrer: gl.filter((l) => (l.part.gols_sofridos ?? l.jogo.gols_contra) === 0).length,
    defesas: defesasG,
    mediaDefesas: gl.length ? defesasG / gl.length : 0,
    dificeis: gl.reduce((t, l) => t + (l.part.defesas_dificeis ?? 0), 0),
    penaltisDefendidos: gl.reduce((t, l) => t + (l.part.penaltis_defendidos ?? 0), 0) + linhas.reduce((t, l) => t + defesasNaDisputa(l.jogo, nomesGoleiro), 0),
    vitorias: gl.filter((l) => l.jogo.resultado === 'V').length,
  };
  let gols = 0, golsPenaltis = 0, assistencias = 0, cartoes = 0, v = 0, e = 0, d = 0, seq = 0, maiorSequencia = 0, craque = 0;
  const acima = { gols: 0, jogos: 0, categorias: new Set<string>() };
  const meses = new Map<string, number>();
  for (const { jogo, part } of linhas) {
    const pen = golsNaDisputa(jogo, part.jogador_id);
    const golsJogo = part.gols + pen;
    gols += golsJogo;
    golsPenaltis += pen;
    assistencias += part.assistencias;
    cartoes += part.amarelos + (part.vermelho ? 1 : 0);
    if (part.craque_do_jogo) craque++;
    if (jogo.resultado === 'V') v++;
    else if (jogo.resultado === 'E') e++;
    else d++;
    seq = golsJogo > 0 ? seq + 1 : 0;
    maiorSequencia = Math.max(maiorSequencia, seq);
    const temporada = Number(jogo.data_hora.slice(0, 4));
    if (jogouAcima(nascimento, jogo.categoria, temporada)) {
      acima.jogos++;
      acima.gols += golsJogo;
      acima.categorias.add(jogo.categoria);
    }
    const mes = jogo.data_hora.slice(0, 7);
    meses.set(mes, (meses.get(mes) ?? 0) + golsJogo);
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
    golsPenaltis,
    acima: { ...acima, categorias: [...acima.categorias].sort() },
    porMes: [...meses].map(([mes, g]) => ({ mes, gols: g })),
    extras,
    goleiro,
  };
}
