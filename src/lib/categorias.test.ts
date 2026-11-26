import { describe, expect, it } from 'vitest';
import {
  categoriaNatural,
  categoriasElegiveis,
  idadeEmAnos,
  jogouAcima,
  podeJogar,
  resultado,
} from './categorias';

describe('categoria natural', () => {
  it('Miguel (2016) é Sub-10 em 2026 e Sub-11 em 2027', () => {
    expect(categoriaNatural('2016-05-03', 2026)).toBe('Sub-10');
    expect(categoriaNatural('2016-12-31', 2027)).toBe('Sub-11');
  });
  it('usa o ano, não a data exata', () => {
    expect(categoriaNatural('2016-01-01', 2026)).toBe(categoriaNatural('2016-12-31', 2026));
  });
  it('adultos', () => {
    expect(categoriaNatural('1998-01-01', 2026)).toBe('Livre');
    expect(categoriaNatural('1991-01-01', 2026)).toBe('Master'); // 35
    expect(categoriaNatural('1986-01-01', 2026)).toBe('Veterano'); // 40
    expect(categoriaNatural('1976-01-01', 2026)).toBe('Cinquentinha'); // 50
  });
});

describe('elegibilidade', () => {
  const miguel = '2016-05-03';
  it('base joga na dele e acima, nunca abaixo', () => {
    expect(podeJogar(miguel, 'Sub-10', 2026)).toBe(true);
    expect(podeJogar(miguel, 'Sub-11', 2026)).toBe(true);
    expect(podeJogar(miguel, 'Sub-17', 2026)).toBe(true);
    expect(podeJogar(miguel, 'Sub-9', 2026)).toBe(false);
    expect(podeJogar(miguel, 'Master', 2026)).toBe(false);
  });
  it('na virada do ano a Sub-10 some das opções do Miguel', () => {
    expect(podeJogar(miguel, 'Sub-10', 2027)).toBe(false);
    expect(categoriasElegiveis(miguel, 2027)[0]).toBe('Sub-11');
  });
  it('adulto joga na dele e nas mais novas', () => {
    const cinquentinha = '1975-01-01';
    expect(['Livre', 'Master', 'Veterano', 'Cinquentinha'].every((c) => podeJogar(cinquentinha, c, 2026))).toBe(true);
    const trintaEOito = '1988-01-01';
    expect(podeJogar(trintaEOito, 'Master', 2026)).toBe(true);
    expect(podeJogar(trintaEOito, 'Livre', 2026)).toBe(true);
    expect(podeJogar(trintaEOito, 'Veterano', 2026)).toBe(false);
    expect(podeJogar(trintaEOito, 'Sub-20', 2026)).toBe(false);
  });
  it('jogo acima da categoria', () => {
    expect(jogouAcima(miguel, 'Sub-11', 2026)).toBe(true);
    expect(jogouAcima(miguel, 'Sub-10', 2026)).toBe(false);
  });
});

describe('outros', () => {
  it('idade exata para a regra dos 18 anos', () => {
    expect(idadeEmAnos('2008-11-20', new Date(2026, 10, 19))).toBe(17);
    expect(idadeEmAnos('2008-11-19', new Date(2026, 10, 19))).toBe(18);
  });
  it('resultado automático', () => {
    expect(resultado(3, 1)).toBe('V');
    expect(resultado(1, 1)).toBe('E');
    expect(resultado(0, 2)).toBe('D');
  });
});

import { categoriasDaCarreira, temporadasDaCarreira } from './categorias';
describe('carreira', () => {
  it('Miguel (2016) tem temporadas de 2021 (Sub-5) até 2026', () => {
    expect(temporadasDaCarreira('2016-11-01', 2026)).toEqual([2026, 2025, 2024, 2023, 2022, 2021]);
  });
  it('categorias da carreira vão do Sub-5 em diante', () => {
    const c = categoriasDaCarreira('2016-11-01', 2026);
    expect(c[0]).toBe('Sub-5');
    expect(c).toContain('Sub-9');
    expect(c).toContain('Sub-10');
  });
  it('em 2025 o Miguel pode Sub-9 e não pode Sub-8', async () => {
    const { podeJogar } = await import('./categorias');
    expect(podeJogar('2016-11-01', 'Sub-9', 2025)).toBe(true);
    expect(podeJogar('2016-11-01', 'Sub-8', 2025)).toBe(false);
  });
});
