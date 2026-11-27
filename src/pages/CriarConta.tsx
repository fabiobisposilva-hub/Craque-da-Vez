import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Erro, Rodape, Topo } from '../components/Comuns';
import { idadeEmAnos } from '../lib/categorias';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { VERSAO_TERMOS } from '../lib/tipos';

export function CriarConta() {
  const [f, setF] = useState({ nome: '', nascimento: '', telefone: '', email: '', senha: '' });
  const [aceitou, setAceitou] = useState(false);
  const [maior, setMaior] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (idadeEmAnos(f.nascimento) < 18) {
      return setErro('Você precisa ter 18 anos ou mais para criar uma conta. Peça para seu pai, mãe ou responsável criar a conta e cadastrar você.');
    }
    if (f.senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.');
    if (!maior) return setErro('Confirme que você tem 18 anos ou mais.');
    const digitos = f.telefone.replace(/\D/g, '');
    if (digitos.length < 10 || digitos.length > 11) return setErro('Informe o celular com DDD, por exemplo (61) 99999-9999.');
    if (!aceitou) return setErro('Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.');
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email,
      password: f.senha,
      options: { data: { nome: f.nome.trim(), data_nascimento: f.nascimento, telefone: digitos, aceitou_termos: 'true', versao_termos: VERSAO_TERMOS, user_agent: navigator.userAgent.slice(0, 300) }, emailRedirectTo: location.origin },
    });
    setEnviando(false);
    if (error) return setErro(mensagemDeErro(error));
    if (!data.session) setEnviado(true);
  }

  if (enviado) {
    return (
      <main className="tela sem-menu">
        <Topo titulo="Confirme seu e-mail" />
        <p>
          Enviamos um link para <b>{f.email}</b>. Abra o e-mail e toque no link para confirmar que o e-mail é seu e ativar a conta. Não achou? Veja a caixa de spam.
        </p>
      </main>
    );
  }

  return (
    <main className="tela sem-menu">
      <Topo titulo="Criar conta" />
      <p className="aviso">Só maiores de 18 anos criam conta. Atletas menores de idade são cadastrados por um pai, mãe ou responsável, dentro da conta dele.</p>
      <form className="pilha" onSubmit={criar}>
        <label className="campo">
          Seu nome
          <input id="nome" required autoComplete="name" value={f.nome} onChange={set('nome')} />
        </label>
        <label className="campo">
          Sua data de nascimento
          <input id="nascimento" type="date" required max={new Date().toISOString().slice(0, 10)} value={f.nascimento} onChange={set('nascimento')} />
        </label>
        <label className="campo">
          Celular (WhatsApp)
          <input id="telefone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="(61) 99999-9999" value={f.telefone}
            onChange={(e) => setF({ ...f, telefone: mascaraTelefone(e.target.value) })} />
        </label>
        <label className="campo">
          E-mail
          <input id="email-novo" type="email" required autoComplete="email" value={f.email} onChange={set('email')} />
        </label>
        <label className="campo">
          Senha (mínimo 8 caracteres)
          <input id="senha-nova" type="password" required minLength={8} autoComplete="new-password" value={f.senha} onChange={set('senha')} />
        </label>
        <label className="aceite">
          <input id="maior18" type="checkbox" checked={maior} onChange={(e) => setMaior(e.target.checked)} />
          <span>Declaro que tenho <b>18 anos ou mais</b>.</span>
        </label>
        <label className="aceite">
          <input id="aceite" type="checkbox" checked={aceitou} onChange={(e) => setAceitou(e.target.checked)} />
          <span>
            Li e aceito os <Link to="/termos" target="_blank">Termos de Uso</Link> e a <Link to="/privacidade" target="_blank">Política de Privacidade</Link>.
          </span>
        </label>
        <Erro msg={erro} />
        <button className="btn btn-primario" disabled={enviando}>
          {enviando ? 'Criando…' : 'Criar conta'}
        </button>
      </form>
      <Rodape />
    </main>
  );
}

function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
