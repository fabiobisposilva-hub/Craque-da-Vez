import { reduzirImagem } from './imagens';
import { supabase } from './supabase';

/** Alvo do papel de parede: 'inicio' ou o id do jogador. */
export type Alvo = string;

const cache = new Map<string, { url: string | null; ate: number }>();

/** Link temporário do papel de parede que ESTA pessoa escolheu para o alvo. */
export async function linkDoPapel(alvo: Alvo): Promise<string | null> {
  const c = cache.get(alvo);
  if (c && c.ate > Date.now()) return c.url;
  const { data } = await supabase.from('papeis_de_parede').select('caminho').eq('alvo', alvo).maybeSingle();
  let url: string | null = null;
  if (data?.caminho) {
    const [bucket, ...resto] = data.caminho.split('/');
    const r = await supabase.storage.from(bucket).createSignedUrl(resto.join('/'), 3600);
    url = r.data?.signedUrl ?? null;
  }
  cache.set(alvo, { url, ate: Date.now() + 50 * 60000 });
  return url;
}

/** Envia a imagem para a pasta da pessoa e define como papel de parede do alvo. */
export async function definirPapel(alvo: Alvo, arquivo: File) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('Entre na sua conta de novo.');
  const blob = await reduzirImagem(arquivo, 1280);
  const nome = `${u.user.id}/${alvo}-${Date.now()}.jpg`;
  const up = await supabase.storage.from('papeis').upload(nome, blob, { contentType: 'image/jpeg' });
  if (up.error) throw up.error;
  const r = await supabase.from('papeis_de_parede').upsert({ usuario_id: u.user.id, alvo, caminho: `papeis/${nome}`, atualizado_em: new Date().toISOString() });
  if (r.error) throw r.error;
  cache.delete(alvo);
  window.dispatchEvent(new Event('craque:papel'));
}

export async function removerPapel(alvo: Alvo) {
  await supabase.from('papeis_de_parede').delete().eq('alvo', alvo);
  cache.delete(alvo);
  window.dispatchEvent(new Event('craque:papel'));
}
