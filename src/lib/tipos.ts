export type Visibilidade = 'publico' | 'aprovados' | 'privado';

export interface Jogador {
  id: string;
  nome: string;
  apelido: string | null;
  data_nascimento: string;
  perna_dominante: 'direita' | 'esquerda' | 'ambidestro' | null;
  foto_url: string | null;
  foto_publica: boolean;
  capa_url: string | null;
  visibilidade: Visibilidade;
  cidade?: string | null;
  uf?: string | null;
  /** Links temporários para mostrar as fotos privadas (preenchidos ao carregar). */
  foto_link?: string | null;
  capa_link?: string | null;
}

export interface Time {
  id: string;
  nome: string;
  modalidade: 'futsal' | 'campo' | 'society';
  cor: string | null;
  escudo_url: string | null;
  tipo: 'particular' | 'tecnico';
  dono_id: string;
  codigo: string;
}

export interface JogadorTime {
  jogador_id: string;
  time_id: string;
  posicao: string | null;
  numero_camisa: number | null;
  status: 'convidado' | 'ativo';
  /** Categoria em que joga neste time (padrão ao lançar jogos). */
  categoria?: string | null;
}

export interface Campeonato {
  id: string;
  time_id: string;
  nome: string;
  temporada: number;
  categoria: string | null;
  situacao: 'andamento' | 'campeao' | 'vice' | 'eliminado';
}

export interface Jogo {
  id: string;
  time_id: string;
  categoria: string;
  data_hora: string;
  adversario: string;
  tipo: 'amistoso' | 'treino' | 'campeonato';
  campeonato_id: string | null;
  fase: string | null;
  local: string | null;
  casa_fora: 'casa' | 'fora' | null;
  gols_pro: number;
  gols_contra: number;
  resultado: 'V' | 'E' | 'D';
  origem: 'tecnico' | 'responsavel';
  oficial: boolean;
  substituido_por: string | null;
  ao_vivo: boolean;
  resumo: string | null;
  lancado_por: string;
  escalacao?: Escalado[] | null;
  penaltis?: boolean;
  penaltis_pro?: number | null;
  penaltis_contra?: number | null;
  cobrancas?: Cobranca[] | null;
  goleiro_penaltis?: string | null;
}

export interface Cobranca {
  lado: 'nos' | 'eles';
  nome: string;
  jogador_id?: string | null;
  resultado: 'gol' | 'defendido' | 'fora';
}

/** Quem venceu a disputa de pênaltis: 'nos', 'eles' ou null. */
export function vencedorPenaltis(j: Pick<Jogo, 'penaltis' | 'penaltis_pro' | 'penaltis_contra' | 'gols_pro' | 'gols_contra'>): 'nos' | 'eles' | null {
  if (!j.penaltis || j.gols_pro !== j.gols_contra || j.penaltis_pro == null || j.penaltis_contra == null || j.penaltis_pro === j.penaltis_contra) return null;
  return j.penaltis_pro > j.penaltis_contra ? 'nos' : 'eles';
}

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as const;

export interface Escalado {
  nome: string;
  posicao: string;
  numero?: number | null;
  titular: boolean;
}

export interface Colega {
  id: string;
  time_id: string;
  nome: string;
  posicao: string | null;
  numero: number | null;
}

export interface Adversario {
  id: string;
  nome: string;
  escudo_url: string | null;
  criado_por: string;
}

export type Papel = 'titular' | 'responsavel' | 'leitor';

export interface Participacao {
  jogo_id: string;
  jogador_id: string;
  gols: number;
  assistencias: number;
  amarelos: number;
  vermelho: boolean;
  suspenso_proximo: boolean;
  titular: boolean;
  craque_do_jogo: boolean;
  observacao: string | null;
}

export interface Notificacao {
  id: string;
  tipo: string;
  payload: Record<string, unknown>;
  lida: boolean;
  criado_em: string;
}

export const POSICOES = {
  futsal: ['Goleiro', 'Fixo', 'Ala direita', 'Ala esquerda', 'Pivô'],
  campo: ['Goleiro', 'Zagueiro', 'Lateral', 'Volante', 'Meia', 'Ponta', 'Atacante'],
  society: ['Goleiro', 'Zagueiro', 'Lateral', 'Volante', 'Meia', 'Ponta', 'Atacante'],
} as const;

export const FASES = [
  ['grupos', 'Grupos / classificatória'],
  ['oitavas', 'Oitavas'],
  ['quartas', 'Quartas'],
  ['semifinal', 'Semifinal'],
  ['final', 'Final'],
] as const;

export const SITUACOES: Record<Campeonato['situacao'], string> = {
  andamento: 'Em andamento',
  campeao: '🏆 Campeão',
  vice: '🥈 Vice',
  eliminado: 'Eliminado',
};

/** Como chamar o jogador nos botões: apelido ou primeiro nome. */
export function chamarDe(j: { nome: string; apelido?: string | null }): string {
  return j.apelido?.trim() || j.nome.trim().split(/\s+/)[0];
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

export const PARENTESCOS: [string, string][] = [
  ['pai', 'Pai'], ['mae', 'Mãe'], ['avo_m', 'Avô'], ['avo_f', 'Avó'], ['tio', 'Tio'], ['tia', 'Tia'],
  ['padrinho', 'Padrinho'], ['madrinha', 'Madrinha'], ['irmao', 'Irmão'], ['irma', 'Irmã'], ['primo', 'Primo'], ['prima', 'Prima'],
  ['padrasto', 'Padrasto'], ['madrasta', 'Madrasta'], ['tecnico', 'Técnico'], ['amigo', 'Amigo(a)'], ['outro', 'Outro'],
];
export const nomeParentesco = (p: string | null | undefined) => PARENTESCOS.find(([k]) => k === p)?.[1] ?? 'Não informado';
