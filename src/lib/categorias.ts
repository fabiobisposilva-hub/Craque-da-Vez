// Regras de categoria do Craque da Vez (documento, item 4).
// A mesma regra existe no banco: supabase/migrations/0001_init.sql
// (funções categoria_natural e pode_jogar). Mantenha as duas iguais.

/** Última categoria da base. Pendente de decisão (doc 4.3): Sub-17 ou Sub-20. */
export const FIM_DA_BASE = 20;
/** Jogador da base pode jogar no Livre? Pendente de decisão (doc 4.3). */
export const BASE_PODE_JOGAR_LIVRE = true;
/** Categoria mais nova oferecida na base. */
export const MENOR_SUB = 5;

export const ADULTAS = ['Livre', 'Master', 'Veterano', 'Cinquentinha'] as const;
export type CategoriaAdulta = (typeof ADULTAS)[number];
export type Categoria = `Sub-${number}` | CategoriaAdulta;

const MINIMO_ADULTO: Record<CategoriaAdulta, number> = {
  Livre: FIM_DA_BASE + 1,
  Master: 35,
  Veterano: 40,
  Cinquentinha: 50,
};

export function temporadaAtual(hoje = new Date()): number {
  return hoje.getFullYear();
}

export function anoDe(dataNascimento: string): number {
  return Number(dataNascimento.slice(0, 4));
}

export function idadeNaTemporada(dataNascimento: string, temporada = temporadaAtual()): number {
  return temporada - anoDe(dataNascimento);
}

export function categoriaNatural(dataNascimento: string, temporada = temporadaAtual()): Categoria {
  const idade = idadeNaTemporada(dataNascimento, temporada);
  if (idade <= FIM_DA_BASE) return `Sub-${Math.max(idade, MENOR_SUB)}`;
  if (idade >= 50) return 'Cinquentinha';
  if (idade >= 40) return 'Veterano';
  if (idade >= 35) return 'Master';
  return 'Livre';
}

export function ehBase(c: string): boolean {
  return /^Sub-\d+$/.test(c);
}

function numeroSub(c: string): number {
  return Number(c.slice(4));
}

/**
 * Base (Sub-X é idade MÁXIMA): joga na dele e em qualquer acima, nunca abaixo.
 * Adultos (idade MÍNIMA): joga na dele e nas mais novas, nunca numa mais velha.
 */
export function podeJogar(dataNascimento: string, categoria: string, temporada = temporadaAtual()): boolean {
  const idade = idadeNaTemporada(dataNascimento, temporada);
  if (ehBase(categoria)) {
    const n = numeroSub(categoria);
    return n >= idade && n <= FIM_DA_BASE;
  }
  const min = MINIMO_ADULTO[categoria as CategoriaAdulta];
  if (min === undefined) return false;
  if (idade <= FIM_DA_BASE) return categoria === 'Livre' && BASE_PODE_JOGAR_LIVRE;
  return idade >= min;
}

/** Todas as categorias, da mais nova para a mais velha. */
export function todasCategorias(): Categoria[] {
  const base: Categoria[] = [];
  for (let n = MENOR_SUB; n <= FIM_DA_BASE; n++) base.push(`Sub-${n}`);
  return [...base, ...ADULTAS];
}

/** Categorias em que o jogador pode atuar nesta temporada. */
export function categoriasElegiveis(dataNascimento: string, temporada = temporadaAtual()): Categoria[] {
  return todasCategorias().filter((c) => podeJogar(dataNascimento, c, temporada));
}

/** "Acima da categoria": na base, uma Sub maior que a natural; ou base jogando Livre. */
export function jogouAcima(dataNascimento: string, categoriaDoJogo: string, temporada: number): boolean {
  const natural = categoriaNatural(dataNascimento, temporada);
  if (!ehBase(natural)) return false;
  if (!ehBase(categoriaDoJogo)) return true;
  return numeroSub(categoriaDoJogo) > numeroSub(natural);
}

export function idadeEmAnos(dataNascimento: string, hoje = new Date()): number {
  const [a, m, d] = dataNascimento.split('-').map(Number);
  let idade = hoje.getFullYear() - a;
  const mes = hoje.getMonth() + 1;
  if (mes < m || (mes === m && hoje.getDate() < d)) idade--;
  return idade;
}

export function resultado(golsPro: number, golsContra: number): 'V' | 'E' | 'D' {
  return golsPro > golsContra ? 'V' : golsPro < golsContra ? 'D' : 'E';
}
