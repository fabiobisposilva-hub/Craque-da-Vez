import { useState } from 'react';
import { Erro, Topo } from '../components/Comuns';
import { idadeEmAnos } from '../lib/categorias';
import { mensagemDeErro, supabase } from '../lib/supabase';

export function CriarConta() {
  const [f, setF] = useState({ nome: '', nascimento: '', email: '', senha: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (idadeEmAnos(f.nascimento) < 18) {
      return setErro('Só maiores de 18 anos criam conta. Peça para seu pai, mãe ou responsável criar a conta e cadastrar você como jogador.');
    }
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email,
      password: f.senha,
      options: { data: { nome: f.nome.trim(), data_nascimento: f.nascimento }, emailRedirectTo: location.origin },
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
          Enviamos um link para <b>{f.email}</b>. Abra o e-mail e toque no link para ativar a conta.
        </p>
      </main>
    );
  }

  return (
    <main className="tela sem-menu">
      <Topo titulo="Criar conta" />
      <p className="muted">Você é o responsável. Depois de criar a conta, cadastre os jogadores: você mesmo, se joga, e seus filhos.</p>
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
          E-mail
          <input id="email-novo" type="email" required autoComplete="email" value={f.email} onChange={set('email')} />
        </label>
        <label className="campo">
          Senha (mínimo 6 caracteres)
          <input id="senha-nova" type="password" required minLength={6} autoComplete="new-password" value={f.senha} onChange={set('senha')} />
        </label>
        <Erro msg={erro} />
        <button className="btn btn-primario" disabled={enviando}>
          {enviando ? 'Criando…' : 'Criar conta'}
        </button>
      </form>
    </main>
  );
}
