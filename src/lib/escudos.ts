import { enviarEscudo } from './imagens';
import { supabase } from './supabase';
import type { Adversario } from './tipos';

const FALTA_SQL = 'Falta rodar o SQL das novidades no Supabase (aplicar-novidades.sql) para salvar escudos.';

function traduzir(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
  if (/bucket|not found|adversarios|row-level/i.test(msg)) return new Error(FALTA_SQL);
  return e instanceof Error ? e : new Error(msg);
}

/** Escudo do nosso time (só o dono do time pode trocar). */
export async function salvarEscudoTime(timeId: string, arquivo: File) {
  try {
    const url = await enviarEscudo(arquivo);
    const { error } = await supabase.from('times').update({ escudo_url: url }).eq('id', timeId);
    if (error) throw error;
  } catch (e) {
    throw traduzir(e);
  }
}

/** Escudo do adversário, guardado pelo nome para reaparecer nos próximos jogos. */
export async function salvarEscudoAdversario(adversarios: Adversario[], meuId: string | null, nome: string, arquivo: File) {
  try {
    const url = await enviarEscudo(arquivo);
    const meu = adversarios.find((a) => a.criado_por === meuId && a.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    const r = meu
      ? await supabase.from('adversarios').update({ escudo_url: url }).eq('id', meu.id)
      : await supabase.from('adversarios').insert({ nome: nome.trim(), escudo_url: url });
    if (r.error) throw r.error;
  } catch (e) {
    throw traduzir(e);
  }
}
