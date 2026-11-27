import { supabase } from './supabase';

/** Reduz a foto no próprio celular antes de enviar (fotos de celular têm vários MB). */
export async function reduzirImagem(arquivo: File, lado = 800, formato: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<Blob> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error('Não consegui abrir esta imagem. Tente outra foto.'));
      i.src = url;
    });
    const escala = Math.min(1, lado / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * escala);
    c.height = Math.round(img.height * escala);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, erro) =>
      c.toBlob((b) => (b ? ok(b) : erro(new Error('Não consegui preparar a imagem.'))), formato, 0.85),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function meuId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Entre na sua conta de novo.');
  return data.user.id;
}

/** Escudo (time ou adversário): pasta pública "escudos/<id do usuário>/". Devolve a URL pública. */
export async function enviarEscudo(arquivo: File): Promise<string> {
  const blob = await reduzirImagem(arquivo, 400, 'image/png');
  const caminho = `${await meuId()}/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage.from('escudos').upload(caminho, blob, { contentType: 'image/png' });
  if (error) throw error;
  return supabase.storage.from('escudos').getPublicUrl(caminho).data.publicUrl;
}

/** Foto ou capa do jogador: pasta privada "fotos/<id do jogador>/". Devolve o caminho guardado no banco. */
export async function enviarFotoJogador(jogadorId: string, arquivo: File, tipo: 'foto' | 'capa'): Promise<string> {
  const blob = await reduzirImagem(arquivo, tipo === 'foto' ? 400 : 1280);
  const caminho = `${jogadorId}/${tipo}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('fotos').upload(caminho, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return caminho;
}

/** Fotos privadas são mostradas por links temporários (10 minutos), gerados só para quem é da família. */
export async function linksDasFotos(caminhos: string[]): Promise<Record<string, string>> {
  const unicos = [...new Set(caminhos.filter((c) => c && !c.startsWith('http')))];
  if (!unicos.length) return {};
  const { data } = await supabase.storage.from('fotos').createSignedUrls(unicos, 600);
  const mapa: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl;
  return mapa;
}
