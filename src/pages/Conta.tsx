import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Erro, Rodape, Topo } from '../components/Comuns';
import { useAuth } from '../lib/auth';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { PARENTESCOS } from '../lib/tipos';
import { Familia } from '../components/Familia';
import { podeEditar, useDados } from '../lib/dados';

export function Conta() {
  const { sessao } = useAuth();
  const nav = useNavigate();
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const d = useDados();
  const meus = d.jogadores.filter((j) => podeEditar(d, j.id));
  const [aberto, setAberto] = useState<string | null>(null);
  useEffect(() => {
    supabase.rpc('eh_admin').then(({ data }) => {
      setAdmin(data === true);
      if (data === true) supabase.rpc('contar_pendentes').then(({ data: n }) => setPendentes(Number(n) || 0));
    });
  }, []);

  useEffect(() => {
    if (!sessao) return;
    supabase.from('usuarios').select('nome').eq('id', sessao.user.id).single().then(({ data }) => setNome(data?.nome ?? ''));
  }, [sessao]);

  async function aceitar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!parentesco) return setErro('Escolha o que você é do atleta.');
    const { data, error } = await supabase.rpc('aceitar_convite', { p_codigo: codigo, p_parentesco: parentesco });
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

      {admin && (
        <Link to="/admin" className="btn btn-primario">📊 Painel do administrador{pendentes > 0 && <span className="bolinha" aria-label={`${pendentes} aguardando liberação`}>{pendentes}</span>}</Link>
      )}

      {meus.length > 0 && (
        <section className="pilha">
          <h2>👨‍👩‍👦 Família e acessos</h2>
          <p className="muted small">Convide a família, veja quem está usando e bloqueie ou libere cada pessoa.</p>
          {meus.map((j) => (
            aberto === j.id || meus.length === 1 ? (
              <Familia key={j.id} jogadorId={j.id} nome={j.apelido || j.nome.split(' ')[0]} />
            ) : (
              <button key={j.id} className="cartao clicavel linha" style={{ font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }} onClick={() => setAberto(j.id)}>
                <b className="cresce">{j.apelido || j.nome.split(' ')[0]}</b>
                <span className="muted small">Abrir ›</span>
              </button>
            )
          ))}
        </section>
      )}

      <form id="convite" className="cartao pilha" onSubmit={aceitar}>
        <h3>Código de convite</h3>
        <p className="muted small">Recebeu um código de convite? Digite aqui para acompanhar o atleta.</p>
        <input id="conta-codigo" required placeholder="Ex.: 3FA9C21B" autoCapitalize="characters" value={codigo} onChange={(e) => setCodigo(e.target.value)} aria-label="Código de convite" />
        <span className="selo">O que você é do atleta?</span>
        <div className="chips">
          {PARENTESCOS.map(([k, v]) => (
            <button key={k} type="button" className="chip" aria-pressed={parentesco === k} onClick={() => setParentesco(k)}>{v}</button>
          ))}
        </div>
        <Erro msg={erro} />
        <button className="btn btn-primario">Usar código</button>
      </form>

      <section className="cartao pilha">
        <h3>🔒 Privacidade</h3>
        <Link to="/conta/privacidade" className="btn btn-primario">Abrir Privacidade</Link>
        <p className="muted small">
          Fotos dos atletas só aparecem para a família. Para outras pessoas, aparecem só o apelido, o time, a categoria e as estatísticas. Nome, data de nascimento e local e horário de jogos futuros nunca aparecem.
        </p>
        <div className="chips">
          <Link to="/termos" className="link">Termos de Uso</Link>
          <Link to="/privacidade" className="link">Política de Privacidade</Link>
        </div>
      </section>

      <button className="btn btn-contorno" onClick={() => supabase.auth.signOut()}>Sair</button>
      <Rodape />
    </main>
  );
}
