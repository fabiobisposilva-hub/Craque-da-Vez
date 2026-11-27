import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { linkDoPapel } from '../lib/papel';

/** O papel de parede vale só na tela do jogador (cada pessoa escolhe o seu). O Início tem a logo como marca-d'água. */
function alvoDaRota(caminho: string): string | null {
  const m = caminho.match(/^\/jogador\/([0-9a-f-]{36})$/);
  return m ? m[1] : null;
}

/** Imagem de fundo atrás da tela inteira, com camada escura para leitura. Cada pessoa escolhe a sua. */
export function PapelDeParede() {
  const { pathname } = useLocation();
  const alvo = alvoDaRota(pathname);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const carregar = () => {
      if (!alvo) return setUrl(null);
      linkDoPapel(alvo).then((u) => vivo && setUrl(u));
    };
    carregar();
    window.addEventListener('craque:papel', carregar);
    return () => { vivo = false; window.removeEventListener('craque:papel', carregar); };
  }, [alvo]);

  useEffect(() => {
    document.body.classList.toggle('com-papel', !!url);
    return () => document.body.classList.remove('com-papel');
  }, [url]);

  if (!url) return null;
  return (
    <>
      <div className="papel-de-parede" style={{ backgroundImage: `url(${url})` }} aria-hidden="true" />
      <div className="papel-de-parede-veu" aria-hidden="true" />
    </>
  );
}
