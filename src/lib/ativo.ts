import { useEffect, useState } from 'react';

const CHAVE = 'craque:jogador-ativo';
const EVENTO = 'craque:jogador-ativo';

export function lerJogadorAtivo(): string | null {
  try { return localStorage.getItem(CHAVE); } catch { return null; }
}

/** O jogador escolhido (o último aberto) vale para Agenda, Times e Lançar jogo. */
export function definirJogadorAtivo(id: string | null) {
  try { if (id) localStorage.setItem(CHAVE, id); else localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ }
  window.dispatchEvent(new Event(EVENTO));
}

/** Jogador ativo válido para a lista de jogadores da conta. Com um só jogador, ele é escolhido sozinho. */
export function useJogadorAtivo(ids: string[]): [string | null, (id: string | null) => void] {
  const [id, setId] = useState<string | null>(lerJogadorAtivo);
  useEffect(() => {
    const ouvir = () => setId(lerJogadorAtivo());
    window.addEventListener(EVENTO, ouvir);
    return () => window.removeEventListener(EVENTO, ouvir);
  }, []);
  const valido = id && ids.includes(id) ? id : ids.length === 1 ? ids[0] : null;
  return [valido, definirJogadorAtivo];
}
