import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configurado = Boolean(url && chave);

export const supabase = createClient(url ?? 'http://localhost', chave ?? 'sem-chave');

/** Traduz as mensagens mais comuns do Supabase Auth. */
export function mensagemDeErro(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e);
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/User already registered/i.test(msg)) return 'Já existe uma conta com este e-mail.';
  if (/Password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (/weak|pwned|leaked/i.test(msg)) return 'Essa senha é fraca ou já apareceu em vazamentos. Escolha outra.';
  if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
  if (/captcha/i.test(msg)) return 'Confirme que você não é um robô e tente de novo.';
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (/Database error saving new user/i.test(msg))
    return 'Não foi possível criar a conta. Só maiores de 18 anos criam conta.';
  return msg;
}
