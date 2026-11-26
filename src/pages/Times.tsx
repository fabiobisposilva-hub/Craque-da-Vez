import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar, dataCurta, Erro, Escudo, EscolherImagem, Resultado, Topo } from '../components/Comuns';
import { enviarEscudo } from '../lib/imagens';
import { salvarEscudoTime } from '../lib/escudos';
import { SalaTrofeus } from '../components/SalaTrofeus';
import { categoriaNatural, categoriasDaCarreira, todasCategorias } from '../lib/categorias';
import { podeEditar, useDados } from '../lib/dados';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { POSICOES, SITUACOES, type Campeonato, type Colega, type Time } from '../lib/tipos';

const CORES = ['#E8000B', '#FFFFFF', '#1E6BFF', '#2FBF71', '#FFC928', '#111111', '#7A3CFF', '#FF7A00'];

function EscudoTime({ t }: { t: Pick<Time, 'nome' | 'cor' | 'escudo_url'> }) {
  return <Escudo nome={t.nome} url={t.escudo_url} cor={t.cor ?? '#E8000B'} />;
}

export function Times() {
  const d = useDados();
  const [entrando, setEntrando] = useState(false);
  return (
    <main className="tela">
      <Topo titulo="Times" voltar={false}>
        <Link to="/times/novo" className="btn btn-primario btn-pequeno">+ Novo time</Link>
      </Topo>
      {!d.carregando && d.times.length === 0 && (
        <div className="vazio">
          <div className="bola" aria-hidden="true">🛡️</div>
          <h3>Nenhum time ainda</h3>
          <p className="muted small">Crie o time da família ou, se você é técnico, o time com as categorias. Para entrar no time de um técnico, use o código que ele passar.</p>
        </div>
      )}
      {d.times.map((t) => {
        const elenco = d.vinculos.filter((v) => v.time_id === t.id && v.status === 'ativo').length;
        const jogos = d.jogos.filter((j) => j.time_id === t.id && !j.substituido_por).length;
        return (
          <Link key={t.id} to={`/times/${t.id}`} className="cartao clicavel">
            <div className="linha">
              <EscudoTime t={t} />
              <div className="cresce">
                <h3>{t.nome}</h3>
                <p className="muted small">
                  {t.modalidade[0].toUpperCase() + t.modalidade.slice(1)} · {t.tipo === 'tecnico' ? 'time do técnico' : 'particular'} · {elenco} atleta{elenco === 1 ? '' : 's'} · {jogos} jogo{jogos === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
      {entrando ? (
        <EntrarComCodigo jogadores={d.jogadores} onPronto={() => { setEntrando(false); d.recarregar(); }} />
      ) : (
        d.jogadores.length > 0 && (
          <button className="btn btn-fantasma" onClick={() => setEntrando(true)}>Entrar no time de um técnico</button>
        )
      )}
    </main>
  );
}

function EntrarComCodigo({ jogadores, onPronto }: { jogadores: { id: string; nome: string }[]; onPronto: () => void }) {
  const [f, setF] = useState({ codigo: '', jogador: jogadores[0]?.id ?? '' });
  const [erro, setErro] = useState<string | null>(null);
  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.rpc('entrar_no_time', { p_codigo: f.codigo, p_jogador: f.jogador });
    if (error) setErro(mensagemDeErro(error));
    else onPronto();
  }
  return (
    <form className="cartao pilha" onSubmit={entrar}>
      <h3>Entrar no time de um técnico</h3>
      <p className="muted small">Ao usar o código, você autoriza o técnico a lançar os jogos deste time. Ele vê só o que acontece no time dele.</p>
      <input id="codigo-time" required placeholder="Código do time" autoCapitalize="characters" value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} aria-label="Código do time" />
      <select id="codigo-jogador" value={f.jogador} onChange={(e) => setF({ ...f, jogador: e.target.value })} aria-label="Jogador">
        {jogadores.map((j) => <option key={j.id} value={j.id}>{j.nome}</option>)}
      </select>
      <Erro msg={erro} />
      <button className="btn btn-primario">Entrar no time</button>
    </form>
  );
}

export function NovoTime() {
  const nav = useNavigate();
  const [f, setF] = useState({ nome: '', modalidade: 'futsal' as Time['modalidade'], cor: CORES[0], tipo: 'particular' as Time['tipo'] });
  const [cats, setCats] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [escudo, setEscudo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (f.tipo === 'tecnico' && cats.length === 0) return setErro('Escolha pelo menos uma categoria do time.');
    const { data, error } = await supabase.from('times').insert({ ...f, nome: f.nome.trim(), escudo_url: escudo }).select('id').single();
    if (error) return setErro(mensagemDeErro(error));
    if (cats.length) {
      const r = await supabase.from('time_categorias').insert(cats.map((c) => ({ time_id: data.id, categoria: c })));
      if (r.error) return setErro(mensagemDeErro(r.error));
    }
    nav(`/times/${data.id}`, { replace: true });
  }

  return (
    <main className="tela sem-menu">
      <Topo titulo="Novo time" />
      <form className="pilha" onSubmit={salvar}>
        <label className="campo">
          Nome do time
          <input id="time-nome" required placeholder="Ex.: Magnus" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        </label>
        <div className="linha">
          <Escudo nome={f.nome || '?'} url={escudo} cor={f.cor} />
          <EscolherImagem id="novo-escudo" desativado={enviando} onArquivo={async (arq) => {
            setEnviando(true); setErro(null);
            try { setEscudo(await enviarEscudo(arq)); } catch (e) { setErro(mensagemDeErro(e)); } finally { setEnviando(false); }
          }}>{enviando ? 'Enviando…' : escudo ? 'Trocar escudo' : '+ Foto do escudo'}</EscolherImagem>
        </div>
        <fieldset className="pilha" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="selo" style={{ marginBottom: 8 }}>Modalidade</legend>
          <div className="chips">
            {(['futsal', 'campo', 'society'] as const).map((m) => (
              <button type="button" key={m} className="chip" aria-pressed={f.modalidade === m} onClick={() => setF({ ...f, modalidade: m })}>
                {m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="pilha" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="selo" style={{ marginBottom: 8 }}>Cor</legend>
          <div className="chips">
            {CORES.map((c) => (
              <button type="button" key={c} className="chip" aria-pressed={f.cor === c} aria-label={`Cor ${c}`} onClick={() => setF({ ...f, cor: c })}
                style={{ width: 40, padding: 0, justifyContent: 'center' }}>
                <span style={{ width: 22, height: 22, borderRadius: 11, background: c, border: '1px solid var(--border)' }} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="pilha" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="selo" style={{ marginBottom: 8 }}>Quem cuida do time</legend>
          <div className="grade-2">
            <button type="button" className="chip" aria-pressed={f.tipo === 'particular'} onClick={() => setF({ ...f, tipo: 'particular' })}>Família</button>
            <button type="button" className="chip" aria-pressed={f.tipo === 'tecnico'} onClick={() => setF({ ...f, tipo: 'tecnico' })}>Sou o técnico</button>
          </div>
          <p className="muted small">
            {f.tipo === 'particular'
              ? 'Só os responsáveis dos seus jogadores veem o time. Você lança os jogos.'
              : 'Você cadastra as categorias, passa o código do time às famílias e seus lançamentos valem como oficiais.'}
          </p>
        </fieldset>
        {f.tipo === 'tecnico' && (
          <fieldset className="pilha" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="selo" style={{ marginBottom: 8 }}>Categorias do time</legend>
            <div className="chips">
              {todasCategorias().map((c) => (
                <button type="button" key={c} className="chip" aria-pressed={cats.includes(c)}
                  onClick={() => setCats(cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c])}>{c}</button>
              ))}
            </div>
          </fieldset>
        )}
        <Erro msg={erro} />
        <button className="btn btn-primario">Criar time</button>
      </form>
    </main>
  );
}

export function TimeDetalhe() {
  const { id } = useParams();
  const d = useDados();
  const [meuId, setMeuId] = useState<string | null>(null);
  const [cats, setCats] = useState<string[]>([]);
  const [catSel, setCatSel] = useState('');
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeuId(data.user?.id ?? null));
    if (id) supabase.from('time_categorias').select('categoria').eq('time_id', id).then(({ data }) => setCats((data ?? []).map((c) => c.categoria)));
  }, [id]);
  const time = d.times.find((t) => t.id === id);
  if (d.carregando) return <main className="tela" aria-busy="true" />;
  if (!time) return <main className="tela"><Topo titulo="Time" /><p className="muted">Time não encontrado.</p></main>;

  const souDono = time.dono_id === meuId;
  const jogos = d.jogos.filter((j) => j.time_id === time.id && !j.substituido_por && (!catSel || j.categoria === catSel));
  const elenco = d.vinculos.filter((v) => v.time_id === time.id && v.status === 'ativo')
    .map((v) => ({ v, j: d.jogadores.find((j) => j.id === v.jogador_id) })).filter((x) => x.j);
  const camps = d.campeonatos.filter((c) => c.time_id === time.id);

  // Estatística do time (artilharia, garçons, cartões)
  const ranking = new Map<string, { nome: string; gols: number; assist: number; cartoes: number; jogos: number }>();
  for (const g of jogos) {
    for (const p of d.participacoes.filter((p) => p.jogo_id === g.id)) {
      const j = d.jogadores.find((x) => x.id === p.jogador_id);
      if (!j) continue;
      const r = ranking.get(j.id) ?? { nome: j.nome, gols: 0, assist: 0, cartoes: 0, jogos: 0 };
      r.gols += p.gols; r.assist += p.assistencias; r.cartoes += p.amarelos + (p.vermelho ? 1 : 0); r.jogos++;
      ranking.set(j.id, r);
    }
  }
  const linhasRanking = [...ranking.values()].sort((a, b) => b.gols - a.gols || b.assist - a.assist);
  const v = jogos.filter((j) => j.resultado === 'V').length, e = jogos.filter((j) => j.resultado === 'E').length;
  const aproveitamento = jogos.length ? Math.round(((v * 3 + e) / (jogos.length * 3)) * 100) : 0;

  return (
    <main className="tela">
      <Topo titulo={time.nome} />
      <div className="linha">
        <EscudoTime t={time} />
        <p className="muted small cresce">
          {time.modalidade[0].toUpperCase() + time.modalidade.slice(1)} · {time.tipo === 'tecnico' ? 'time do técnico' : 'particular'}
        </p>
        {souDono && (
          <EscolherImagem id="escudo-time" onArquivo={async (f) => {
            try { await salvarEscudoTime(time.id, f); d.recarregar(); }
            catch (e) { alert(mensagemDeErro(e)); }
          }}>{time.escudo_url ? 'Trocar escudo' : '+ Escudo'}</EscolherImagem>
        )}
      </div>
      {souDono && time.tipo === 'tecnico' && (
        <div className="cartao">
          <p className="selo">Código do time</p>
          <b className="num" style={{ fontSize: 28, letterSpacing: '0.14em' }}>{time.codigo}</b>
          <p className="muted small">Passe este código às famílias. Elas entram em Times → Entrar no time de um técnico, e isso vale como a autorização do responsável.</p>
        </div>
      )}
      {cats.length > 0 && (
        <div className="chips" aria-label="Categoria">
          <button className="chip" aria-pressed={!catSel} onClick={() => setCatSel('')}>Todas</button>
          {cats.map((c) => <button key={c} className="chip" aria-pressed={catSel === c} onClick={() => setCatSel(c)}>{c}</button>)}
        </div>
      )}

      <div className="numeros">
        <div className="numero"><b>{jogos.length}</b><span>Jogos</span></div>
        <div className="numero"><b>{jogos.reduce((s, j) => s + j.gols_pro, 0)}</b><span>Gols pró</span></div>
        <div className="numero"><b>{jogos.reduce((s, j) => s + j.gols_contra, 0)}</b><span>Contra</span></div>
        <div className="numero"><b>{aproveitamento}%</b><span>Aprov.</span></div>
      </div>

      {linhasRanking.length > 0 && (
        <section className="cartao" style={{ overflowX: 'auto' }}>
          <h3 style={{ marginBottom: 8 }}>Artilharia e garçons</h3>
          <table className="tabela">
            <thead><tr><th>Atleta</th><th className="n">J</th><th className="n">Gols</th><th className="n">Assist.</th><th className="n">Cart.</th></tr></thead>
            <tbody>
              {linhasRanking.map((r) => (
                <tr key={r.nome}><td>{r.nome}</td><td className="n">{r.jogos}</td><td className="n"><b>{r.gols}</b></td><td className="n">{r.assist}</td><td className="n">{r.cartoes}</td></tr>
              ))}
            </tbody>
          </table>
          {!souDono && <p className="muted small" style={{ marginTop: 8 }}>Mostra só os seus jogadores.</p>}
        </section>
      )}

      <section className="pilha">
        <div className="secao-titulo"><h2>Elenco</h2></div>
        {elenco.length === 0 && <p className="muted small">Ninguém no elenco ainda. Abra o perfil de um jogador e toque em “Colocar num time”.</p>}
        {elenco.map(({ v, j }) => (
          <div key={j!.id} className="cartao pilha" style={{ gap: 10 }}>
            <Link to={`/jogador/${j!.id}`} className="linha" style={{ color: 'inherit', textDecoration: 'none' }}>
              <Avatar jogador={j!} numero={v.numero_camisa} />
              <div className="cresce">
                <h3>{j!.nome}</h3>
                <p className="muted small">{[v.categoria, v.posicao, v.numero_camisa != null && `camisa ${v.numero_camisa}`].filter(Boolean).join(' · ') || 'Posição não informada'}</p>
              </div>
            </Link>
            {podeEditar(d, j!.id) && (
              <label className="linha small" style={{ gap: 8 }}>
                <span className="muted cresce">Categoria neste time</span>
                <select id={`cat-${j!.id}`} style={{ width: 'auto' }} value={v.categoria ?? ''} onChange={async (e) => {
                  await supabase.from('jogador_times').update({ categoria: e.target.value || null }).match({ jogador_id: j!.id, time_id: time.id });
                  d.recarregar();
                }}>
                  <option value="">Automática (pelo ano do jogo)</option>
                  {categoriasDaCarreira(j!.data_nascimento).map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            )}
          </div>
        ))}
        {elenco.length > 0 && <p className="muted small">Posições do {time.modalidade}: {POSICOES[time.modalidade].join(', ')}.</p>}
      </section>

      <SalaTrofeus campeonatos={camps} />

      <ColegasDoTime timeId={time.id} modalidade={time.modalidade} colegas={d.colegas.filter((c) => c.time_id === time.id)}
        podeEditar={souDono || elenco.some(({ j }) => podeEditar(d, j!.id))} onMudou={d.recarregar} />

      <Campeonatos timeId={time.id} categorias={cats.length ? cats : [...new Set(elenco.map(({ j }) => categoriaNatural(j!.data_nascimento)))]} camps={camps} podeEditar={souDono || time.tipo === 'particular'} onMudou={d.recarregar} />

      {jogos.length > 0 && (
        <section className="cartao">
          <h3 style={{ marginBottom: 12 }}>Jogos</h3>
          {jogos.slice(0, 15).map((j) => (
            <div key={j.id} className="lista-jogo">
              <Resultado r={j.resultado} />
              <div className="cresce"><b className="num">{j.gols_pro} × {j.gols_contra}</b> {j.adversario}
                <p className="muted small">{dataCurta(j.data_hora)} · {j.categoria}{j.oficial && time.tipo === 'tecnico' ? ' · oficial' : ''}</p>
              </div>
            </div>
          ))}
        </section>
      )}
      {souDono && <ExcluirTime timeId={time.id} nome={time.nome} jogos={d.jogos.filter((g) => g.time_id === time.id).length} campeonatos={camps.length} />}
    </main>
  );
}

function Campeonatos({ timeId, categorias, camps, podeEditar, onMudou }: { timeId: string; categorias: string[]; camps: Campeonato[]; podeEditar: boolean; onMudou: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ nome: '', temporada: String(new Date().getFullYear()), categoria: '' });
  const [erro, setErro] = useState<string | null>(null);
  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const { error } = await supabase.from('campeonatos').insert({
      time_id: timeId, nome: f.nome.trim(), temporada: Number(f.temporada), categoria: f.categoria || null,
    });
    if (error) return setErro(mensagemDeErro(error));
    setAberto(false);
    setF({ ...f, nome: '' });
    onMudou();
  }
  const [apagando, setApagando] = useState<string | null>(null);
  const [erroApagar, setErroApagar] = useState<string | null>(null);
  async function excluir(c: Campeonato) {
    setErroApagar(null);
    const { error } = await supabase.rpc('excluir_campeonato', { p_id: c.id });
    if (error) return setErroApagar(mensagemDeErro(error));
    setApagando(null);
    onMudou();
  }
  async function mudar(c: Campeonato, situacao: Campeonato['situacao']) {
    await supabase.from('campeonatos').update({ situacao }).eq('id', c.id);
    onMudou();
  }
  return (
    <section className="pilha">
      <div className="secao-titulo">
        <h2>Campeonatos</h2>
        {podeEditar && !aberto && <button className="link" onClick={() => setAberto(true)}>+ Novo campeonato</button>}
      </div>
      {aberto && (
        <form className="cartao pilha" onSubmit={criar}>
          <label className="campo">
            Nome do campeonato
            <input id="camp-nome" required placeholder="Ex.: Copa Brasília" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </label>
          <div className="grade-2">
            <label className="campo">
              Temporada
              <input id="camp-temp" type="number" inputMode="numeric" min={2000} max={2100} required value={f.temporada} onChange={(e) => setF({ ...f, temporada: e.target.value })} />
            </label>
            <label className="campo">
              Categoria
              <select id="camp-cat" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
                <option value="">Todas</option>
                {categorias.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <Erro msg={erro} />
          <button className="btn btn-primario">Criar campeonato</button>
          <button type="button" className="link" onClick={() => setAberto(false)}>Cancelar</button>
        </form>
      )}
      {camps.length === 0 && !aberto && <p className="muted small">Nenhum campeonato ainda. Crie aqui ou na hora de lançar um jogo.</p>}
      {camps.map((c) => (
        <div key={c.id} className="cartao linha" style={{ flexWrap: 'wrap' }}>
          <div className="cresce">
            <h3>{c.nome} {c.temporada}</h3>
            <p className="muted small">{c.categoria ?? 'Todas as categorias'}</p>
          </div>
          {podeEditar ? (
            <>
              <select id={`camp-${c.id}`} value={c.situacao} onChange={(e) => mudar(c, e.target.value as Campeonato['situacao'])} aria-label={`Situação do ${c.nome}`} style={{ width: 'auto' }}>
                {Object.entries(SITUACOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className="btn btn-fantasma btn-pequeno" aria-label={`Excluir ${c.nome}`} onClick={() => { setApagando(c.id); setErroApagar(null); }}>🗑️ Excluir</button>
            </>
          ) : (
            <span className="etiqueta">{SITUACOES[c.situacao]}</span>
          )}
          {apagando === c.id && (
            <div className="pilha" style={{ flexBasis: '100%' }}>
              <p className="small"><b>Excluir “{c.nome}”?</b> Os jogos dele continuam no app, mas passam a contar como amistosos. Não dá para desfazer.</p>
              <div className="grade-2">
                <button className="btn btn-primario btn-pequeno" style={{ width: '100%' }} onClick={() => excluir(c)}>Sim, excluir</button>
                <button className="btn btn-fantasma btn-pequeno" style={{ width: '100%' }} onClick={() => setApagando(null)}>Cancelar</button>
              </div>
              <Erro msg={erroApagar} />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function ColegasDoTime({ timeId, modalidade, colegas, podeEditar, onMudou }: {
  timeId: string; modalidade: keyof typeof POSICOES; colegas: Colega[]; podeEditar: boolean; onMudou: () => void;
}) {
  const [f, setF] = useState({ nome: '', posicao: '', numero: '' });
  const [erro, setErro] = useState<string | null>(null);
  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const { error } = await supabase.from('time_colegas').insert({
      time_id: timeId, nome: f.nome.trim(), posicao: f.posicao || null, numero: f.numero === '' ? null : Number(f.numero),
    });
    if (error) return setErro(/time_colegas/.test(error.message) ? 'Falta rodar o SQL da escalação no Supabase (aplicar-escalacao.sql).' : /duplicate|unique/i.test(error.message) ? 'Esse nome já está no elenco.' : mensagemDeErro(error));
    setF({ nome: '', posicao: '', numero: '' });
    onMudou();
  }
  async function remover(id: string) {
    await supabase.from('time_colegas').delete().eq('id', id);
    onMudou();
  }
  if (!podeEditar && !colegas.length) return null;
  return (
    <section className="pilha">
      <div className="secao-titulo"><h2>Colegas do time</h2></div>
      <p className="muted small">Quem joga junto e não tem conta no app. Eles aparecem prontos na escalação de cada jogo.</p>
      {colegas.map((c) => (
        <div key={c.id} className="cartao linha" style={{ padding: '10px 14px' }}>
          <span className="num camisa">{c.numero ?? '–'}</span>
          <b className="cresce">{c.nome}</b>
          <span className="muted small">{c.posicao ?? ''}</span>
          {podeEditar && <button className="link" aria-label={`Remover ${c.nome}`} onClick={() => remover(c.id)}>✕</button>}
        </div>
      ))}
      {podeEditar && (
        <form className="cartao pilha" onSubmit={adicionar}>
          <div className="escalado" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 7.5rem) 3.6rem' }}>
            <input id="colega-nome" required placeholder="Nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} aria-label="Nome do colega" />
            <select id="colega-pos" value={f.posicao} onChange={(e) => setF({ ...f, posicao: e.target.value })} aria-label="Posição">
              <option value="">Posição</option>
              {POSICOES[modalidade].map((p) => <option key={p}>{p}</option>)}
            </select>
            <input id="colega-num" type="number" inputMode="numeric" min={0} max={99} placeholder="Nº" value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} aria-label="Número da camisa" />
          </div>
          <Erro msg={erro} />
          <button className="btn btn-fantasma">+ Adicionar ao elenco</button>
        </form>
      )}
    </section>
  );
}

function ExcluirTime({ timeId, nome, jogos, campeonatos }: { timeId: string; nome: string; jogos: number; campeonatos: number }) {
  const nav = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const temDados = jogos > 0 || campeonatos > 0;
  const confirmado = !temDados || texto.trim().toUpperCase() === 'EXCLUIR';

  async function excluir() {
    setExcluindo(true);
    setErro(null);
    const { error, count } = await supabase.from('times').delete({ count: 'exact' }).eq('id', timeId);
    setExcluindo(false);
    if (error) return setErro(mensagemDeErro(error));
    if (!count) return setErro('Só quem criou o time pode excluí-lo.');
    nav('/times', { replace: true });
  }

  if (!aberto)
    return (
      <button className="btn btn-contorno" style={{ marginTop: 8 }} onClick={() => setAberto(true)}>🗑️ Excluir time</button>
    );
  return (
    <section className="cartao pilha" style={{ borderColor: 'var(--accent)' }}>
      <h3>Excluir “{nome}”?</h3>
      {temDados ? (
        <>
          <p className="small">
            Isso apaga <b>de vez</b> o time e também{' '}
            <b>{jogos} jogo{jogos === 1 ? '' : 's'}</b>
            {campeonatos > 0 && <> e <b>{campeonatos} campeonato{campeonatos === 1 ? '' : 's'}</b></>} dele, com os gols, assistências e cartões desses jogos.
            Os jogadores continuam no app. Não dá para desfazer.
          </p>
          <label className="campo">
            Para confirmar, digite EXCLUIR
            <input id="confirma-excluir-time" autoCapitalize="characters" autoComplete="off" value={texto} onChange={(e) => setTexto(e.target.value)} />
          </label>
        </>
      ) : (
        <p className="small">O time não tem jogos nem campeonatos. Os jogadores do elenco continuam no app.</p>
      )}
      <Erro msg={erro} />
      <div className="grade-2">
        <button className="btn btn-primario" disabled={!confirmado || excluindo} onClick={excluir}>{excluindo ? 'Excluindo…' : 'Sim, excluir'}</button>
        <button className="btn btn-fantasma" onClick={() => { setAberto(false); setTexto(''); }}>Cancelar</button>
      </div>
    </section>
  );
}
