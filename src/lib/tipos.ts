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
}

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
