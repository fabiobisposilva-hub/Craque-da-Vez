import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar, dataCurta, Erro, Escudo, EscolherImagem, Resultado, Topo } from '../components/Comuns';
import { Confronto, ehFuturo, SeloAgendado } from '../components/Confronto';
import { SalaTrofeus } from '../components/SalaTrofeus';
import { categoriaNatural, categoriasDaCarreira } from '../lib/categorias';
import { escudoDoAdversario, podeEditar, useDados } from '../lib/dados';
import { golsDoJogador, linhasDoJogador, resumir } from '../lib/estatisticas';
import { enviarFotoJogador } from '../lib/imagens';
import { definirPapel } from '../lib/papel';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { iniciais, POSICOES } from '../lib/tipos';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
type Aba = 'resumo' | 'jogos' | 'estatisticas';
const POR_PAGINA = 10;

function lerAba(): Aba {
  try { const a = sessionStorage.getItem('craque:aba-jogador'); return a === 'jogos' || a === 'estatisticas' ? a : 'resumo'; } catch { return 'resumo'; }
}

export function PerfilJogador() {
  const { id } = useParams();
  const d = useDados();
  const jogador = d.jogadores.find((j) => j.id === id);
  const [timeSel, setTimeSel] = useState('');
  const [aba, setAbaEstado] = useState<Aba>(lerAba);
  const setAba = (a: Aba) => { setAbaEstado(a); try { sessionStorage.setItem('craque:aba-jogador', a); } catch { /* ignora */ } };
  const [filtro, setFiltro] = useState({ categoria: '', campeonato: '', temporada: '' });
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [enviando, setEnviando] = useState<'' | 'foto' | 'papel'>('');
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  useEffect(() => setMostrar(POR_PAGINA), [timeSel, filtro]);

  async function trocarFoto(arquivo: File) {
    if (!jogador) return;
    setEnviando('foto'); setErroFoto(null);
    try {
      const caminho = await enviarFotoJogador(jogador.id, arquivo, 'foto');
      const { error } = await supabase.from('jogadores').update({ foto_url: caminho }).eq('id', jogador.id);
      if (error) throw error;
      await d.recarregar();
    } catch (e) { setErroFoto(mensagemDeErro(e)); } finally { setEnviando(''); }
  }
  async function trocarPapel(arquivo: File) {
    if (!jogador) return;
    setEnviando('papel'); setErroFoto(null);
    try { await definirPapel(jogador.id, arquivo); } catch (e) { setErroFoto(mensagemDeErro(e)); } finally { setEnviando(''); }
  }

  const todas = useMemo(() => (jogador ? linhasDoJogador(d.jogos, d.participacoes, jogador.id) : []), [d.jogos, d.participacoes, jogador]);

  if (d.carregando) return <main className="tela" aria-busy="true" />;
  if (!jogador)
    return (
      <main className="tela">
        <Topo titulo="Jogador" />
        <p className="muted">Jogador não encontrado ou sem permissão para ver.</p>
      </main>
    );

  const editor = podeEditar(d, jogador.id);
  const vinculos = d.vinculos.filter((v) => v.jogador_id === jogador.id);
  const timesDoJogador = vinculos.map((v) => ({ v, t: d.times.find((t) => t.id === v.time_id)! })).filter((x) => x.t);
  const doTime = todas.filter(({ jogo }) => !timeSel || jogo.time_id === timeSel);
  const linhas = doTime.filter(({ jogo }) =>
    (!filtro.categoria || jogo.categoria === filtro.categoria) &&
    (!filtro.campeonato || jogo.campeonato_id === filtro.campeonato) &&
    (!filtro.temporada || jogo.data_hora.startsWith(filtro.temporada)));
  const r = resumir(linhas, jogador.data_nascimento);
  const rTime = resumir(doTime, jogador.data_nascimento);
  const camps = d.campeonatos.filter((c) => doTime.some((l) => l.jogo.campeonato_id === c.id));
  const natural = categoriaNatural(jogador.data_nascimento);
  const idsTimes = new Set(timeSel ? [timeSel] : vinculos.map((v) => v.time_id));
  const proximos = d.jogos.filter((g) => idsTimes.has(g.time_id) && !g.substituido_por && ehFuturo(g)).sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  const vinculoSel = vinculos.find((v) => v.time_id === timeSel);

  return (
    <main className="tela">
      {/* Cabeçalho */}
      <div className="cabeca-jogador">
        <Link to="/" className="voltar" aria-label="Voltar ao início" style={{ textDecoration: 'none' }}>←</Link>
        <div className="chips" style={{ justifyContent: 'flex-end' }}>
          <EscolherImagem id="trocar-papel" desativado={!!enviando} onArquivo={trocarPapel}>{enviando === 'papel' ? 'Enviando…' : '🖼️ Papel de parede'}</EscolherImagem>
          {editor && <Link to={`/jogador/${jogador.id}/editar`} className="btn btn-fantasma btn-pequeno" aria-label="Alterar dados do jogador">✏️</Link>}
        </div>
      </div>
      <div className="linha" style={{ gap: 14 }}>
        {editor ? (
          <label htmlFor="trocar-foto" className="avatar grande editavel" title="Trocar foto">
            {jogador.foto_link ? <img src={jogador.foto_link} alt="" style={{ borderRadius: '50%' }} /> : <span>{iniciais(jogador.nome)}</span>}
            <span className="selo-camera" aria-hidden="true">{enviando === 'foto' ? '…' : '📷'}</span>
            <input id="trocar-foto" type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) trocarFoto(f); }} />
          </label>
        ) : <Avatar jogador={jogador} grande />}
        <div className="cresce" style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 22 }}>{jogador.apelido || jogador.nome.split(' ')[0]}</h1>
          {jogador.apelido && <p className="muted small">{jogador.nome}</p>}
          <p className="muted small">
            {natural} · {jogador.data_nascimento.slice(0, 4)}
          </p>
        </div>
      </div>
      <Erro msg={erroFoto} />

      {editor && <Convites jogadorId={jogador.id} vinculos={vinculos.filter((v) => v.status === 'convidado').map((v) => ({ ...v, time: d.times.find((t) => t.id === v.time_id)?.nome ?? 'Time' }))} onMudou={d.recarregar} />}

      {/* Seletor de time: vale para a tela inteira */}
      {timesDoJogador.length > 0 && (
        <div className="seletor-time" role="tablist" aria-label="Time">
          {timesDoJogador.length > 1 && (
            <button role="tab" className="chip" aria-pressed={!timeSel} onClick={() => setTimeSel('')}>Todos</button>
          )}
          {timesDoJogador.map(({ t }) => (
            <button key={t.id} role="tab" className="chip" aria-pressed={timeSel === t.id || timesDoJogador.length === 1} onClick={() => setTimeSel(t.id)}>
              <Escudo nome={t.nome} url={t.escudo_url} cor={t.cor} tamanho={22} /> {t.nome}
            </button>
          ))}
        </div>
      )}
      {vinculoSel && (
        <p className="muted small" style={{ textAlign: 'center', marginTop: -6 }}>
          {[vinculoSel.categoria, vinculoSel.posicao, vinculoSel.numero_camisa != null && `camisa ${vinculoSel.numero_camisa}`].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Abas */}
      <div className="abas" role="tablist">
        {([['resumo', 'Resumo'], ['jogos', 'Jogos'], ['estatisticas', 'Estatísticas']] as const).map(([k, v]) => (
          <button key={k} role="tab" aria-selected={aba === k} className={'aba' + (aba === k ? ' ativa' : '')} onClick={() => setAba(k)}>{v}</button>
        ))}
      </div>

      {aba === 'resumo' && (
        <>
          <div className="numeros">
            <div className="numero"><b>{rTime.jogos}</b><span>Jogos</span></div>
            <div className="numero"><b>{rTime.gols}</b><span>Gols</span>{rTime.golsPenaltis > 0 && <small className="numero-extra">{rTime.golsPenaltis} nos pênaltis</small>}</div>
            <div className="numero"><b>{rTime.assistencias}</b><span>Assist.</span></div>
            <div className="numero"><b>{rTime.cartoes}</b><span>Cartões</span></div>
          </div>

          {proximos[0] && (
            <Link to={`/jogo/${proximos[0].id}`} className="cartao clicavel pilha" style={{ gap: 10 }}>
              <span className="selo">Próximo jogo</span>
              <SeloAgendado data={proximos[0].data_hora} />
              <Confronto jogo={proximos[0]} time={d.times.find((t) => t.id === proximos[0].time_id)} escudoAdversario={escudoDoAdversario(d, proximos[0].adversario)} />
            </Link>
          )}

          {(() => {
            const ultimo = [...doTime].reverse()[0];
            if (!ultimo) return null;
            return (
              <Link to={`/jogo/${ultimo.jogo.id}`} className="cartao clicavel pilha" style={{ gap: 10 }}>
                <span className="selo">Último jogo</span>
                <Confronto jogo={ultimo.jogo} time={d.times.find((t) => t.id === ultimo.jogo.time_id)} escudoAdversario={escudoDoAdversario(d, ultimo.jogo.adversario)} />
                {(golsDoJogador(ultimo.jogo, ultimo.part) > 0 || ultimo.part.assistencias > 0 || ultimo.part.craque_do_jogo) && (
                  <p className="small" style={{ textAlign: 'center' }}>
                    {ultimo.part.craque_do_jogo && '⭐ Craque do jogo · '}
                    {golsDoJogador(ultimo.jogo, ultimo.part) > 0 && `⚽ ${golsDoJogador(ultimo.jogo, ultimo.part)} gol${golsDoJogador(ultimo.jogo, ultimo.part) > 1 ? 's' : ''} `}
                    {ultimo.part.assistencias > 0 && `· 🅰 ${ultimo.part.assistencias} assist.`}
                  </p>
                )}
              </Link>
            );
          })()}

          <SalaTrofeus campeonatos={camps} nomeDoTime={(tid) => d.times.find((t) => t.id === tid)?.nome}
            vazio={doTime.length ? 'Quando um campeonato terminar com título, marque “🏆 Campeão” na página do time e o troféu aparece aqui.' : undefined} />

          {todas.length === 0 && (
            <div className="vazio">
              <div className="bola" aria-hidden="true">⚽</div>
              <h3>Nenhum jogo ainda</h3>
              {editor && (timesDoJogador.length
                ? <Link className="btn btn-primario" to="/lancar">Lançar o primeiro jogo</Link>
                : <Link className="btn btn-primario" to="/times/novo">Criar time</Link>)}
            </div>
          )}
          {editor && <ColocarEmTime jogadorId={jogador.id} nascimento={jogador.data_nascimento} jaEsta={vinculos.map((v) => v.time_id)} times={d.times} onMudou={d.recarregar} />}
        </>
      )}

      {aba === 'jogos' && (
        <>
          {proximos.length > 0 && (
            <section className="pilha" style={{ gap: 8 }}>
              <span className="selo">Agendados</span>
              {proximos.map((g) => (
                <Link key={g.id} to={`/jogo/${g.id}`} className="jogo-linha">
                  <span className="jogo-linha-data agendado">{dataCurta(g.data_hora)}</span>
                  <Escudo nome={g.adversario} url={escudoDoAdversario(d, g.adversario)} tamanho={28} />
                  <span className="cresce jogo-linha-nome">vs {g.adversario}</span>
                  <span className="tipo-jogo tipo-campeonato" style={{ background: 'rgba(232,0,11,0.18)', color: '#ffb3b6', borderColor: 'var(--accent)' }}>Agendado</span>
                </Link>
              ))}
            </section>
          )}
          {doTime.length === 0 && <p className="muted small" style={{ textAlign: 'center' }}>Nenhum jogo disputado ainda.</p>}
          {(() => {
            const lista = [...doTime].reverse().slice(0, mostrar);
            const porAno = new Map<string, typeof lista>();
            for (const l of lista) { const a = l.jogo.data_hora.slice(0, 4); porAno.set(a, [...(porAno.get(a) ?? []), l]); }
            return [...porAno].map(([ano, ls]) => (
              <section key={ano} className="pilha" style={{ gap: 8 }}>
                <span className="selo">Temporada {ano}</span>
                {ls.map(({ jogo, part }) => {
                  const g = golsDoJogador(jogo, part);
                  return (
                    <Link key={jogo.id} to={`/jogo/${jogo.id}`} className="jogo-linha">
                      <Resultado r={jogo.resultado} />
                      <span className="jogo-linha-data">{dataCurta(jogo.data_hora)}</span>
                      <Escudo nome={jogo.adversario} url={escudoDoAdversario(d, jogo.adversario)} tamanho={28} />
                      <span className="cresce jogo-linha-nome">
                        <b className="num">{jogo.gols_pro}×{jogo.gols_contra}</b> {jogo.adversario}
                        {jogo.penaltis && jogo.penaltis_pro != null && <span className="penaltis-mini"> ({jogo.penaltis_pro}×{jogo.penaltis_contra} pên.)</span>}
                      </span>
                      <span className="jogo-linha-mim">{part.craque_do_jogo && '⭐'}{g > 0 && `⚽${g}`}{part.assistencias > 0 && ` 🅰${part.assistencias}`}</span>
                    </Link>
                  );
                })}
              </section>
            ));
          })()}
          {doTime.length > mostrar && (
            <button className="btn btn-fantasma" onClick={() => setMostrar(mostrar + POR_PAGINA)}>Ver mais {Math.min(POR_PAGINA, doTime.length - mostrar)} jogos</button>
          )}
        </>
      )}

      {aba === 'estatisticas' && (
        <>
          {doTime.length === 0 ? <p className="muted small" style={{ textAlign: 'center' }}>As estatísticas aparecem depois do primeiro jogo.</p> : (
            <>
              <div className="grade-2">
                <select id="f-temp" aria-label="Temporada" value={filtro.temporada} onChange={(e) => setFiltro({ ...filtro, temporada: e.target.value })}>
                  <option value="">Todas as temporadas</option>
                  {[...new Set(doTime.map((l) => l.jogo.data_hora.slice(0, 4)))].sort().reverse().map((t) => <option key={t}>{t}</option>)}
                </select>
                <select id="f-cat" aria-label="Categoria" value={filtro.categoria} onChange={(e) => setFiltro({ ...filtro, categoria: e.target.value })}>
                  <option value="">Todas as categorias</option>
                  {[...new Set(doTime.map((l) => l.jogo.categoria))].map((c) => <option key={c}>{c}</option>)}
                </select>
                {camps.length > 0 && (
                  <select id="f-camp" aria-label="Campeonato" style={{ gridColumn: '1 / -1' }} value={filtro.campeonato} onChange={(e) => setFiltro({ ...filtro, campeonato: e.target.value })}>
                    <option value="">Todos os campeonatos</option>
                    {camps.map((c) => <option key={c.id} value={c.id}>{c.nome} {c.temporada}</option>)}
                  </select>
                )}
              </div>

              <div className="numeros">
                <div className="numero"><b>{r.jogos}</b><span>Jogos</span></div>
                <div className="numero"><b>{r.gols}</b><span>Gols</span></div>
                <div className="numero"><b>{r.assistencias}</b><span>Assist.</span></div>
                <div className="numero"><b>{r.cartoes}</b><span>Cartões</span></div>
              </div>

              <section className="cartao pilha">
                <div className="linha" style={{ flexWrap: 'wrap', gap: 16 }}>
                  <span className="linha" style={{ gap: 6 }}><Resultado r="V" /> <b className="num">{r.v}</b></span>
                  <span className="linha" style={{ gap: 6 }}><Resultado r="E" /> <b className="num">{r.e}</b></span>
                  <span className="linha" style={{ gap: 6 }}><Resultado r="D" /> <b className="num">{r.d}</b></span>
                  <span className="cresce" style={{ textAlign: 'right' }}><b className="num">{r.aproveitamento}%</b> <span className="muted small">aproveitamento</span></span>
                </div>
                <ul className="lista-stats">
                  <li><span>Média de gols por jogo</span><b className="num">{r.media.toFixed(2).replace('.', ',')}</b></li>
                  <li><span>Maior sequência marcando</span><b className="num">{r.maiorSequencia} jogo{r.maiorSequencia === 1 ? '' : 's'}</b></li>
                  {r.craque > 0 && <li><span>⭐ Craque do jogo</span><b className="num">{r.craque}×</b></li>}
                  {r.golsPenaltis > 0 && <li><span>🥅 Gols em disputa de pênaltis</span><b className="num">{r.golsPenaltis}</b></li>}
                  {r.acima.jogos > 0 && <li><span>Jogando acima da categoria ({r.acima.categorias.join(', ')})</span><b className="num">{r.acima.gols} gols em {r.acima.jogos}</b></li>}
                </ul>
              </section>

              {r.porMes.length > 1 && (
                <section className="cartao">
                  <h3>Gols mês a mês</h3>
                  <div className="barras" role="img" aria-label={r.porMes.map((m) => `${m.mes}: ${m.gols} gols`).join(', ')}>
                    {r.porMes.slice(-12).map((m) => (
                      <div className="barra" key={m.mes}>
                        <b className="num">{m.gols}</b>
                        <i style={{ height: `${(m.gols / Math.max(1, ...r.porMes.map((x) => x.gols))) * 100}%` }} />
                        <small>{MESES[Number(m.mes.slice(5)) - 1]}</small>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {!timeSel && timesDoJogador.length > 1 && (
                <section className="cartao" style={{ overflowX: 'auto' }}>
                  <h3 style={{ marginBottom: 8 }}>Comparar times</h3>
                  <table className="tabela">
                    <thead><tr><th>Time</th><th className="n">J</th><th className="n">Gols</th><th className="n">Assist.</th><th className="n">Aprov.</th></tr></thead>
                    <tbody>
                      {timesDoJogador.map(({ t }) => {
                        const rt = resumir(todas.filter((l) => l.jogo.time_id === t.id), jogador.data_nascimento);
                        return rt.jogos > 0 && (
                          <tr key={t.id} onClick={() => setTimeSel(t.id)} style={{ cursor: 'pointer' }}>
                            <td><span className="vs"><Escudo nome={t.nome} url={t.escudo_url} cor={t.cor} tamanho={22} /> {t.nome}</span></td>
                            <td className="n">{rt.jogos}</td><td className="n"><b>{rt.gols}</b></td><td className="n">{rt.assistencias}</td><td className="n">{rt.aproveitamento}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

function Convites({ jogadorId, vinculos, onMudou }: { jogadorId: string; vinculos: { time_id: string; time: string }[]; onMudou: () => void }) {
  if (!vinculos.length) return null;
  async function responder(timeId: string, aceitar: boolean) {
    const { data } = await supabase.auth.getUser();
    const q = supabase.from('jogador_times');
    if (aceitar) {
      await q.update({ status: 'ativo', aprovado_por_responsavel: data.user?.id }).match({ jogador_id: jogadorId, time_id: timeId });
      await supabase.rpc('registrar_consentimento', { p_jogador: jogadorId, p_tipo: 'acesso_tecnico', p_valor: 'aceito', p_versao: '1.1' });
    }
    else await q.delete().match({ jogador_id: jogadorId, time_id: timeId });
    onMudou();
  }
  return (
    <section className="cartao pilha">
      {vinculos.map((v) => (
        <div key={v.time_id} className="pilha">
          <p>
            <b>O técnico do time {v.time} convidou o atleta para o elenco.</b> Se você aprovar, o técnico poderá ver o nome e lançar as estatísticas do jogador <b>nos jogos deste time</b>. Ele não verá os dados de outros times, a data de nascimento completa nem as fotos.
          </p>
          <div className="grade-2">
            <button className="btn btn-primario" onClick={() => responder(v.time_id, true)}>Aprovar</button>
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
              <option value="">Categoria: automática (pelo ano do jogo)</option>
              {categoriasDaCarreira(nascimento).map((c) => <option key={c} value={c}>Categoria: {c}</option>)}
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
