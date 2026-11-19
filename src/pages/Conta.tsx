import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Erro, Topo } from '../components/Comuns';
import { useAuth } from '../lib/auth';
import { mensagemDeErro, supabase } from '../lib/supabase';

export function Conta() {
  const { sessao } = useAuth();
  const nav = useNavigate();
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!sessao) return;
    supabase.from('usuarios').select('nome').eq('id', sessao.user.id).single().then(({ data }) => setNome(data?.nome ?? ''));
  }, [sessao]);

  async function aceitar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const { data, error } = await supabase.rpc('aceitar_convite', { p_codigo: codigo });
    if (error) setErro(mensagemDeErro(error));
    else nav(`/jogador/${data}`);
  }

  return (
    <main className="tela">
      <Topo titulo="Perfil" voltar={false} />
      <section className="cartao">
        <h2>{nome || 'Responsável'}</h2>
        <p className="muted small">{sessao?.user.email}</p>
      </section>

      <form id="convite" className="cartao pilha" onSubmit={aceitar}>
        <h3>Código de convite</h3>
        <p className="muted small">Recebeu um código de outro responsável? Digite aqui para cuidar do jogador junto com ele.</p>
        <input id="conta-codigo" required placeholder="Ex.: 3FA9C21B" autoCapitalize="characters" value={codigo} onChange={(e) => setCodigo(e.target.value)} aria-label="Código de convite" />
        <Erro msg={erro} />
        <button className="btn btn-primario">Usar código</button>
      </form>

      <section className="cartao pilha">
        <h3>Privacidade</h3>
        <p className="muted small">
          Outros usuários veem só o nome, a categoria e as estatísticas dos seus jogadores. Data de nascimento, local e horário de jogos futuros nunca aparecem. A foto só aparece se você ligar “Mostrar foto no perfil público”.
        </p>
      </section>

      <button className="btn btn-contorno" onClick={() => supabase.auth.signOut()}>Sair</button>
    </main>
  );
}
