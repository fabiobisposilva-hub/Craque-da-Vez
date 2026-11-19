import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Erro } from '../components/Comuns';
import { Logo } from '../components/Logo';
import { mensagemDeErro, supabase } from '../lib/supabase';

export function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setErro(mensagemDeErro(error));
    setEnviando(false);
  }

  async function esqueci() {
    setErro(null);
    if (!email) return setErro('Digite seu e-mail acima para receber o link de nova senha.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/nova-senha' });
    if (error) setErro(mensagemDeErro(error));
    else setInfo('Enviamos um link para ' + email + ' criar uma nova senha.');
  }

  return (
    <main className="tela sem-menu" style={{ paddingTop: 40 }}>
      <Logo compacto />
      <form className="pilha" onSubmit={entrar} style={{ marginTop: 16 }}>
        <label className="campo">
          E-mail
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="campo">
          Senha
          <input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        <div style={{ textAlign: 'right' }}>
          <button type="button" className="link" onClick={esqueci}>
            Esqueci minha senha
          </button>
        </div>
        <Erro msg={erro} />
        {info && <div className="aviso">{info}</div>}
        <button className="btn btn-primario" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        <Link to="/criar-conta" className="btn btn-contorno">
          Criar conta
        </Link>
        <p className="aviso">Só maiores de 18 anos criam conta. Atletas menores são cadastrados pelo responsável.</p>
      </form>
    </main>
  );
}

export function NovaSenha() {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) setErro(mensagemDeErro(error));
    else setOk(true);
  }
  return (
    <main className="tela sem-menu" style={{ paddingTop: 40 }}>
      <h1>Nova senha</h1>
      <form className="pilha" onSubmit={salvar}>
        <label className="campo">
          Nova senha
          <input id="nova-senha" type="password" autoComplete="new-password" minLength={6} required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        <Erro msg={erro} />
        {ok ? (
          <Link className="btn btn-primario" to="/">
            Senha alterada. Ir para o início
          </Link>
        ) : (
          <button className="btn btn-primario">Salvar senha</button>
        )}
      </form>
    </main>
  );
}
