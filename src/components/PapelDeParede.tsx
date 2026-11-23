import { useEffect, useState } from 'react';
import { linksDasFotos } from '../lib/imagens';
import { supabase } from '../lib/supabase';

const CHAVE = 'craque:jogador-em-destaque';

/** Marca qual jogador dá o papel de parede (o último perfil aberto). */
export function destacarJogador(id: string) {
  try { localStorage.setItem(CHAVE, id); } catch { /* sem armazenamento: usa o primeiro jogador */ }
  window.dispatchEvent(new Event('craque:papel'));
}

/** Avisa que a imagem mudou (depois de enviar uma nova). */
export function atualizarPapelDeParede() {
  window.dispatchEvent(new Event('craque:papel'));
}

/** Imagem de fundo do app inteiro, atrás de todas as telas, com camada escura para leitura. */
export function PapelDeParede() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function carregar() {
      const { data } = await supabase.from('jogadores').select('id, capa_url').not('capa_url', 'is', null);
      const lista = (data ?? []) as { id: string; capa_url: string }[];
      let escolhido: string | null = null;
      try { escolhido = localStorage.getItem(CHAVE); } catch { /* ignora */ }
      const j = lista.find((x) => x.id === escolhido) ?? lista[0];
      if (!j) return vivo && setUrl(null);
      const links = await linksDasFotos([j.capa_url]);
      if (vivo) setUrl(links[j.capa_url] ?? null);
    }
    carregar();
    window.addEventListener('craque:papel', carregar);
    return () => { vivo = false; window.removeEventListener('craque:papel', carregar); };
  }, []);

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
