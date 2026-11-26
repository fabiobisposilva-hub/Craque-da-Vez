import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar, dataCurta, Erro, Escudo, EscolherImagem, Resultado, TipoJogo, Topo } from '../components/Comuns';
import { enviarFotoJogador } from '../lib/imagens';
import { SalaTrofeus } from '../components/SalaTrofeus';
import { atualizarPapelDeParede, destacarJogador } from '../components/PapelDeParede';
import { categoriaNatural, categoriasElegiveis } from '../lib/categorias';
import { escudoDoAdversario, podeEditar, useDados } from '../lib/dados';
import { linhasDoJogador, resumir } from '../lib/estatisticas';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { iniciais, POSICOES } from '../lib/tipos';

const ROTULO_VIS = { publico: 'Público', aprovados: 'Só aprovados', privado: 'Privado' };
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function PerfilJogador() {
  const { id } = useParams();
  const d = useDados();
  const jogador = d.jogadores.find((j) => j.id === id);
  const [filtro, setFiltro] = useState({ time: '', categoria: '', campeonato: '', temporada: '' });
  const [enviando, setEnviando] = useState<'' | 'foto' | 'capa'>('');
  const [erroFoto, setErroFoto] = useState<string | null>(null);

  async function trocarImagem(tipo: 'foto' | 'capa', arquivo: File) {
    if (!jogador) return;
    setEnviando(tipo);
    setErroFoto(null);
    try {
      const caminho = await enviarFotoJogador(jogador.id, arquivo, tipo);
      const { error } = await supabase.from('jogadores').update(tipo === 'foto' ? { foto_url: caminho } : { capa_url: caminho }).eq('id', jogador.id);
      if (error) throw error;
      await d.recarregar();
      if (tipo === 'capa') destacarJogador(jogador.id);
      else atualizarPapelDeParede();
    } catch (e) {
      setErroFoto(mensagemDeErro(e));
    } finally {
      setEnviando('');
    }
  }

  const todas = useMemo(() => (jogador ? linhasDoJogador(d.jogos, d.participacoes, jogador.id) : []), [d.jogos, d.participacoes, jogador]);
  const linhas = todas.filter(
    ({ jogo }) =>
      (!filtro.time || jogo.time_id === filtro.time) &&
      (!filtro.categoria || jogo.categoria === filtro.categoria) &&
      (!filtro.campeonato || jogo.campeonato_id === filtro.campeonato) &&
      (!filtro.temporada || jogo.data_hora.startsWith(filtro.temporada)),
  );

  if (d.carregando) return <main className="tela" aria-busy="true" />;
  if (!jogador)
    return (
      <main className="tela">
        <Topo titulo="Jogador" />
        <p className="muted">Jogador não encontrado ou sem permissão para ver.</p>
      </main>
    );

  const r = resumir(linhas, jogador.data_nascimento);
  const vinculos = d.vinculos.filter((v) => v.jogador_id === jogador.id);
  const timesDoJogador = vinculos.map((v) => ({ v, t: d.times.find((t) => t.id === v.time_id)! })).filter((x) => x.t);
  const camps = d.campeonatos.filter((c) => todas.some((l) => l.jogo.campeonato_id === c.id));
  const categorias = [...new Set(todas.map((l) => l.jogo.categoria))];
  const temporadas = [...new Set(todas.map((l) => l.jogo.data_hora.slice(0, 4)))].sort().reverse();
  const natural = categoriaNatural(jogador.data_nascimento);
  const maxMes = Math.max(1, ...r.porMes.map((m) => m.gols));
  const temFiltro = Object.values(filtro).some(Boolean);
  const editor = podeEditar(d, jogador.id);
  if (jogador.capa_url) queueMicrotask(() => { try { if (localStorage.getItem('craque:jogador-em-destaque') !== jogador.id) destacarJogador(jogador.id); } catch { /* ignora */ } });
  // Números separados por time
  const porTime = timesDoJogador
    .map(({ t }) => ({ t, r: resumir(todas.filter((l) => l.jogo.time_id === t.id), jogador.data_nascimento) }))
    .filter((x) => x.r.jogos > 0);

  return (
    <main className="tela">
      <div className="capa">
        {editor && (
          <EscolherImagem id="trocar-capa" desativado={!!enviando} onArquivo={(f) => trocarImagem('capa', f)}>
            {enviando === 'capa' ? 'Enviando…' : jogador.capa_url ? '🖼️ Trocar papel de parede' : '🖼️ Papel de parede'}
          </EscolherImagem>
        )}
      </div>
      <div className="perfil-cabeca">
        {editor ? (
          <label htmlFor="trocar-foto" className="avatar grande editavel" title="Trocar foto">
            {jogador.foto_link ? <img src={jogador.foto_link} alt="" style={{ borderRadius: '50%' }} /> : <span>{iniciais(jogador.nome)}</span>}
            <span className="selo-camera" aria-hidden="true">{enviando === 'foto' ? '…' : '📷'}</span>
            <input id="trocar-foto" type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) trocarImagem('foto', f); }} />
          </label>
        ) : (
          <Avatar jogador={jogador} grande />
        )}
        <div className="cresce chips" style={{ paddingBottom: 4 }}>
          <span className="etiqueta">🔒 {ROTULO_VIS[jogador.visibilidade]}</span>
          {!editor && <span className="etiqueta">👀 Só visualização</span>}
        </div>
      </div>
      <Erro msg={erroFoto} />
      <div className="linha" style={{ alignItems: 'flex-start' }}>
        <div className="cresce">
        <h1>{jogador.nome}</h1>
        {jogador.apelido && <p style={{ fontWeight: 700, color: 'var(--accent-text)' }}>“{jogador.apelido}”</p>}
        <p className="muted">
          {natural} · {jogador.data_nascimento.slice(0, 4)}
          {jogador.perna_dominante && ` · perna ${jogador.perna_dominante}`}
          {(jogador.cidade || jogador.uf) && <><br />📍 {[jogador.cidade, jogador.uf].filter(Boolean).join(' - ')}</>}
        </p>
        </div>
        {editor && (
          <Link to={`/jogador/${jogador.id}/editar`} className="voltar" aria-label="Alterar dados do jogador" title="Alterar dados do jogador" style={{ textDecoration: 'none' }}>
            <Lapis />
          </Link>
        )}
      </div>
      {timesDoJogador.length > 0 && (
        <div className="chips">
          {timesDoJogador.map(({ v, t }) => (
            <Link key={t.id} to={`/times/${t.id}`} className="etiqueta" style={{ color: 'inherit', textDecoration: 'none' }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: t.cor ?? 'var(--accent)' }} />
              {t.nome}
              {v.numero_camisa != null && ` · ${v.numero_camisa}`}
              {v.posicao && ` · ${v.posicao}`}
              {v.status === 'convidado' && ' · convite'}
            </Link>
          ))}
        </div>
      )}

      {editor && <Convites jogadorId={jogador.id} vinculos={vinculos.filter((v) => v.status === 'convidado').map((v) => ({ ...v, time: d.times.find((t) => t.id === v.time_id)?.nome ?? 'Time' }))} onMudou={d.recarregar} />}

      {porTime.length > 1 && (
        <div className="chips" role="tablist" aria-label="Separar por time">
          <button className="chip" role="tab" aria-pressed={!filtro.time} onClick={() => setFiltro({ ...filtro, time: '' })}>Todos os times</button>
          {porTime.map(({ t }) => (
            <button key={t.id} className="chip" role="tab" aria-pressed={filtro.time === t.id} onClick={() => setFiltro({ ...filtro, time: t.id })}>
              <Escudo nome={t.nome} url={t.escudo_url} cor={t.cor} tamanho={22} /> {t.nome}
            </button>
          ))}
        </div>
      )}

      <SalaTrofeus campeonatos={camps} nomeDoTime={(id) => d.times.find((t) => t.id === id)?.nome}
        vazio={todas.length ? 'Quando um campeonato terminar com título, marque “🏆 Campeão” na página do time e o troféu aparece aqui.' : undefined} />

      <div className="numeros">
        <div className="numero"><b>{r.jogos}</b><span>Jogos</span></div>
        <div className="numero"><b>{r.gols}</b><span>Gols</span></div>
        <div className="numero"><b>{r.assistencias}</b><span>Assist.</span></div>
        <div className="numero"><b>{r.cartoes}</b><span>Cartões</span></div>
      </div>

      {todas.length === 0 ? (
        <div className="vazio">
          <div className="bola" aria-hidden="true">⚽</div>
          <h3>Nenhum jogo ainda</h3>
          <p className="muted small">{timesDoJogador.length ? 'Lance o primeiro jogo para começar a carreira.' : 'Coloque o jogador num time e lance o primeiro jogo.'}</p>
          {timesDoJogador.length ? (
            <Link className="btn btn-primario" to="/lancar">Lance o primeiro jogo</Link>
          ) : (
            <Link className="btn btn-primario" to="/times/novo">Criar time</Link>
          )}
        </div>
      ) : (
        <>
          <section className="pilha" aria-label="Filtros">
            <div className="grade-2">
              <select id="f-time" aria-label="Time" value={filtro.time} onChange={(e) => setFiltro({ ...filtro, time: e.target.value })}>
                <option value="">Todos os times</option>
                {timesDoJogador.map(({ t }) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <select id="f-temp" aria-label="Temporada" value={filtro.temporada} onChange={(e) => setFiltro({ ...filtro, temporada: e.target.value })}>
                <option value="">Todas as temporadas</option>
                {temporadas.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select id="f-cat" aria-label="Categoria" value={filtro.categoria} onChange={(e) => setFiltro({ ...filtro, categoria: e.target.value })}>
                <option value="">Todas as categorias</option>
                {categorias.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select id="f-camp" aria-label="Campeonato" value={filtro.campeonato} onChange={(e) => setFiltro({ ...filtro, campeonato: e.target.value })}>
                <option value="">Todos os campeonatos</option>
                {camps.map((c) => <option key={c.id} value={c.id}>{c.nome} {c.temporada}</option>)}
              </select>
            </div>
            {temFiltro && (
              <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setFiltro({ time: '', categoria: '', campeonato: '', temporada: '' })}>
                Limpar filtros
              </button>
            )}
          </section>

          <section className="cartao pilha">
            <div className="linha" style={{ flexWrap: 'wrap', gap: 16 }}>
              <span className="linha" style={{ gap: 6 }}><Resultado r="V" /> <b className="num">{r.v}</b></span>
              <span className="linha" style={{ gap: 6 }}><Resultado r="E" /> <b className="num">{r.e}</b></span>
              <span className="linha" style={{ gap: 6 }}><Resultado r="D" /> <b className="num">{r.d}</b></span>
              <span className="cresce" style={{ textAlign: 'right' }}><b className="num">{r.aproveitamento}%</b> <span className="muted small">aproveitamento</span></span>
            </div>
            <p className="small muted">
              Média de <b style={{ color: 'var(--text)' }}>{r.media.toFixed(2).replace('.', ',')}</b> gol por jogo · maior sequência marcando: <b style={{ color: 'var(--text)' }}>{r.maiorSequencia}</b> jogo{r.maiorSequencia === 1 ? '' : 's'}
              {r.craque > 0 && <> · <span className="estrela">★</span> craque do jogo {r.craque}×</>}
            </p>
            {r.acima.jogos > 0 && (
              <p className="small">
                <b>{r.gols - r.acima.gols}</b> gols no {natural} e <b>{r.acima.gols}</b> jogando acima ({r.acima.categorias.join(', ')}), em {r.acima.jogos} jogo{r.acima.jogos === 1 ? '' : 's'}.
              </p>
            )}
          </section>

          {(() => {
            const minhas = linhas.flatMap(({ jogo }) => (jogo.cobrancas ?? []).filter((c) => c.lado === 'nos' && c.jogador_id === jogador.id));
            if (!minhas.length) return null;
            const gols = minhas.filter((c) => c.resultado === 'gol').length;
            return <p className="cartao small">🥅 Pênaltis em disputas: <b>{gols} de {minhas.length}</b> convertidos</p>;
          })()}

          {porTime.length > 1 && !filtro.time && (
            <section className="cartao" style={{ overflowX: 'auto' }}>
              <h3 style={{ marginBottom: 8 }}>Por time</h3>
              <table className="tabela">
                <thead><tr><th>Time</th><th className="n">J</th><th className="n">Gols</th><th className="n">Assist.</th><th className="n">Cart.</th><th className="n">Aprov.</th></tr></thead>
                <tbody>
                  {porTime.map(({ t, r: rt }) => (
                    <tr key={t.id} onClick={() => setFiltro({ ...filtro, time: t.id })} style={{ cursor: 'pointer' }}>
                      <td><span className="vs"><Escudo nome={t.nome} url={t.escudo_url} cor={t.cor} tamanho={24} /> {t.nome}</span></td>
                      <td className="n">{rt.jogos}</td><td className="n"><b>{rt.gols}</b></td><td className="n">{rt.assistencias}</td><td className="n">{rt.cartoes}</td><td className="n">{rt.aproveitamento}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small" style={{ marginTop: 8 }}>Toque num time para ver só os números dele.</p>
            </section>
          )}

          {r.porMes.length > 1 && (
            <section className="cartao">
              <h3>Gols mês a mês</h3>
              <div className="barras" role="img" aria-label={r.porMes.map((m) => `${m.mes}: ${m.gols} gols`).join(', ')}>
                {r.porMes.slice(-12).map((m) => (
                  <div className="barra" key={m.mes}>
                    <b className="num">{m.gols}</b>
                    <i style={{ height: `${(m.gols / maxMes) * 100}%` }} />
                    <small>{MESES[Number(m.mes.slice(5)) - 1]}</small>
                  </div>
                ))}
              </div>
            </section>
          )}


          <section className="cartao">
            <h3 style={{ marginBottom: 12 }}>Últimos jogos</h3>
            {[...linhas].reverse().slice(0, 10).map(({ jogo, part }) => (
              <Link key={jogo.id} to={`/jogo/${jogo.id}`} className="lista-jogo" style={{ color: 'inherit', textDecoration: 'none' }}>
                <Resultado r={jogo.resultado} />
                <Escudo nome={jogo.adversario} url={escudoDoAdversario(d, jogo.adversario)} tamanho={32} />
                <div className="cresce" style={{ minWidth: 0 }}>
                  <b className="num">{jogo.gols_pro} × {jogo.gols_contra}</b> {jogo.adversario}
                  <div><TipoJogo jogo={jogo} campeonato={d.campeonatos.find((c) => c.id === jogo.campeonato_id)} /></div>
                  <p className="muted small">
                    {dataCurta(jogo.data_hora)} · {d.times.find((t) => t.id === jogo.time_id)?.nome} · {jogo.categoria}
                  </p>
                  {part.observacao && <p className="small" style={{ marginTop: 2 }}>“{part.observacao}”</p>}
                </div>
                <div className="small" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {part.craque_do_jogo && <span className="estrela" title="Craque do jogo">★ </span>}
                  {part.gols > 0 && <span>⚽{part.gols} </span>}
                  {part.assistencias > 0 && <span>🅰{part.assistencias} </span>}
                  {part.amarelos > 0 && <i className="cartao-ico am" title="Amarelo" />}
                  {part.vermelho && <> <i className="cartao-ico vm" title="Vermelho" /></>}
                </div>
              </Link>
            ))}
          </section>
        </>
      )}

      {editor && <ColocarEmTime jogadorId={jogador.id} nascimento={jogador.data_nascimento} jaEsta={vinculos.map((v) => v.time_id)} times={d.times} onMudou={d.recarregar} />}
      {editor && <Responsaveis jogadorId={jogador.id} nome={jogador.apelido || jogador.nome.split(' ')[0]} />}
    </main>
  );
}

function Convites({ jogadorId, vinculos, onMudou }: { jogadorId: string; vinculos: { time_id: string; time: string }[]; onMudou: () => void }) {
  if (!vinculos.length) return null;
  async function responder(timeId: string, aceitar: boolean) {
    const { data } = await supabase.auth.getUser();
    const q = supabase.from('jogador_times');
    if (aceitar) await q.update({ status: 'ativo', aprovado_por_responsavel: data.user?.id }).match({ jogador_id: jogadorId, time_id: timeId });
    else await q.delete().match({ jogador_id: jogadorId, time_id: timeId });
    onMudou();
  }
  return (
    <section className="cartao pilha">
      {vinculos.map((v) => (
        <div key={v.time_id} className="pilha">
          <p>
            O técnico do <b>{v.time}</b> convidou o jogador para o elenco. Se aceitar, o técnico passa a lançar os jogos deste time e vê só o que acontece nele.
          </p>
          <div className="grade-2">
            <button className="btn btn-primario" onClick={() => responder(v.time_id, true)}>Aceitar</button>
            <button className="btn btn-fantasma" onClick={() => responder(v.time_id, false)}>Recusar</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function ColocarEmTime({ jogadorId, nascimento, jaEsta, times, onMudou }: { jogadorId: string; nascimento?: string; jaEsta: string[]; times: { id: string; nome: string; modalidade: keyof typeof POSICOES; dono_id: string }[]; onMudou: () => void }) {
  const [meuId, setMeuId] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ time: '', posicao: '', numero: '', categoria: '' });
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeuId(data.user?.id ?? null));
  }, []);
  const opcoes = times.filter((t) => t.dono_id === meuId && !jaEsta.includes(t.id));
  const time = opcoes.find((t) => t.id === f.time);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('jogador_times').insert({
      jogador_id: jogadorId, time_id: f.time, posicao: f.posicao || null, numero_camisa: f.numero === '' ? null : Number(f.numero), categoria: f.categoria || null,
    });
    if (error) return setErro(mensagemDeErro(error));
    setAberto(false);
    setF({ time: '', posicao: '', numero: '', categoria: '' });
    onMudou();
  }

  if (!aberto)
    return (
      <button className="btn btn-fantasma" onClick={() => setAberto(true)}>
        + Colocar num time
      </button>
    );
  return (
    <form className="cartao pilha" onSubmit={salvar}>
      <h3>Colocar num time</h3>
      {opcoes.length === 0 ? (
        <p className="muted small">
          Nenhum time seu disponível. <Link to="/times/novo">Criar time</Link>
        </p>
      ) : (
        <>
          <select id="ct-time" required value={f.time} onChange={(e) => setF({ ...f, time: e.target.value, posicao: '' })} aria-label="Time">
            <option value="">Escolha o time</option>
            {opcoes.map((t) => <option key={t.id} value={t.id}>{t.nome} ({t.modalidade})</option>)}
          </select>
          {time && (
            <div className="grade-2">
              <select id="ct-pos" value={f.posicao} onChange={(e) => setF({ ...f, posicao: e.target.value })} aria-label="Posição">
                <option value="">Posição</option>
                {POSICOES[time.modalidade].map((p) => <option key={p}>{p}</option>)}
              </select>
              <input id="ct-num" type="number" inputMode="numeric" min={0} max={99} placeholder="Camisa" value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} aria-label="Número da camisa" />
            </div>
          )}
          {time && nascimento && (
            <select id="ct-cat" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} aria-label="Categoria neste time">
              <option value="">Categoria: automática ({categoriaNatural(nascimento)})</option>
              {categoriasElegiveis(nascimento).map((c) => <option key={c} value={c}>Categoria: {c}</option>)}
            </select>
          )}
          <Erro msg={erro} />
          <button className="btn btn-primario" disabled={!f.time}>Salvar</button>
        </>
      )}
      <button type="button" className="link" onClick={() => setAberto(false)}>Cancelar</button>
    </form>
  );
}

function Responsaveis({ jogadorId, nome }: { jogadorId: string; nome: string }) {
  const [lista, setLista] = useState<{ usuario_id: string; papel: string }[]>([]);
  const [convite, setConvite] = useState<{ codigo: string; papel: 'responsavel' | 'leitor' } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    supabase.from('jogador_responsaveis').select('usuario_id, papel').eq('jogador_id', jogadorId).eq('status', 'ativo')
      .then(({ data }) => setLista(data ?? []));
  }, [jogadorId]);
  const editores = lista.filter((l) => l.papel !== 'leitor').length;
  const leitores = lista.length - editores;

  async function convidar(papel: 'responsavel' | 'leitor') {
    setErro(null);
    setAviso(null);
    const { data, error } = await supabase.from('convites_responsavel').insert({ jogador_id: jogadorId, papel }).select('codigo').single();
    if (error) setErro(/papel/.test(error.message) ? 'Falta rodar o SQL novo no Supabase para liberar o convite só para ver.' : mensagemDeErro(error));
    else setConvite({ codigo: data.codigo, papel });
  }

  const mensagem = convite
    ? `Oi! Te convidei para ${convite.papel === 'leitor' ? `acompanhar o ${nome}` : `cuidar junto comigo do ${nome}`} no Craque da Vez ⚽\n\n` +
      `1. Abra ${location.origin}\n2. Toque em "Criar conta" (só maiores de 18)\n3. Em Perfil → Código de convite, digite: ${convite.codigo}\n\nO código vale por 7 dias.`
    : '';

  async function compartilhar() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Craque da Vez', text: mensagem });
        return;
      }
      await navigator.clipboard.writeText(mensagem);
      setAviso('Mensagem copiada. Cole no WhatsApp para enviar.');
    } catch {
      setAviso('Copie a mensagem abaixo e envie pelo WhatsApp.');
    }
  }

  return (
    <section className="cartao pilha">
      <h3>Família</h3>
      <p className="muted small">
        <b style={{ color: 'var(--text)' }}>Responsáveis</b> podem lançar jogos e alterar o jogador (até 4, você incluído: {editores} de 4).{' '}
        <b style={{ color: 'var(--text)' }}>Só para ver</b>: avós, tios e amigos acompanham tudo, mas não alteram nada ({leitores} hoje).
      </p>
      {convite ? (
        <div className="pilha">
          <p className="selo">{convite.papel === 'leitor' ? 'Convite só para ver' : 'Convite de responsável'}</p>
          <b className="num" style={{ fontSize: 26, letterSpacing: '0.12em' }}>{convite.codigo}</b>
          <button className="btn btn-primario" onClick={compartilhar}>Enviar convite pelo WhatsApp</button>
          <textarea id="msg-convite" readOnly value={mensagem} rows={6} onFocus={(e) => e.currentTarget.select()} aria-label="Mensagem do convite" />
          {aviso && <p className="muted small">{aviso}</p>}
          <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setConvite(null)}>Fazer outro convite</button>
        </div>
      ) : (
        <div className="grade-2">
          <button className="btn btn-fantasma" onClick={() => convidar('leitor')}>👀 Convidar só para ver</button>
          <button className="btn btn-fantasma" onClick={() => convidar('responsavel')} disabled={editores >= 4}>✏️ Convidar responsável</button>
        </div>
      )}
      <Erro msg={erro} />
    </section>
  );
}

function Lapis() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}
