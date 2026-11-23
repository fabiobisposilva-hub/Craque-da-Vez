import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Contador, Erro, Escudo, EscolherImagem, Topo } from '../components/Comuns';
import { salvarEscudoAdversario, salvarEscudoTime } from '../lib/escudos';
import { categoriaNatural, categoriasElegiveis, podeJogar, resultado, todasCategorias } from '../lib/categorias';
import { escudoDoAdversario, podeEditar, useDados } from '../lib/dados';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { chamarDe, FASES, type Jogador } from '../lib/tipos';

interface Part {
  jogou: boolean;
  gols: number;
  assistencias: number;
  amarelos: number;
  vermelho: boolean;
  suspenso_proximo: boolean;
  titular: boolean;
  craque_do_jogo: boolean;
  observacao: string;
}
const partVazia = (): Part => ({ jogou: true, gols: 0, assistencias: 0, amarelos: 0, vermelho: false, suspenso_proximo: false, titular: true, craque_do_jogo: false, observacao: '' });

function paraCampoData(data: Date) {
  const d = new Date(data);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
const agoraLocal = () => paraCampoData(new Date());

type Evento = { tipo: 'gol' | 'assist' | 'amarelo' | 'vermelho'; jogador: string } | { tipo: 'gol_time' | 'gol_adv' };

export function LancarJogo() {
  const nav = useNavigate();
  const { id: jogoId } = useParams();
  const d = useDados();
  const [resumo, setResumo] = useState('');
  const [carregouEdicao, setCarregouEdicao] = useState(false);
  const [enviandoEscudo, setEnviandoEscudo] = useState(false);
  const [timeId, setTimeId] = useState('');
  const [catsDoTime, setCatsDoTime] = useState<string[]>([]);
  const [categoria, setCategoria] = useState('');
  const [tipo, setTipo] = useState<'amistoso' | 'treino' | 'campeonato'>('amistoso');
  const [campId, setCampId] = useState('');
  const [novoCamp, setNovoCamp] = useState<string | null>(null);
  const [fase, setFase] = useState('');
  const [dataHora, setDataHora] = useState(agoraLocal());
  const [adversario, setAdversario] = useState('');
  const [local, setLocal] = useState('');
  const [casaFora, setCasaFora] = useState<'casa' | 'fora' | ''>('');
  const [golsPro, setGolsPro] = useState(0);
  const [golsContra, setGolsContra] = useState(0);
  const [parts, setParts] = useState<Record<string, Part>>({});
  const [aoVivo, setAoVivo] = useState(false);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (erro) document.querySelector('.erro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [erro]);
  const [salvando, setSalvando] = useState(false);

  const time = d.times.find((t) => t.id === timeId);
  const temporada = Number(dataHora.slice(0, 4)) || new Date().getFullYear();

  // Começa no primeiro time disponível
  useEffect(() => {
    if (!timeId && d.times.length) setTimeId(d.times[0].id);
  }, [d.times, timeId]);

  useEffect(() => {
    if (!timeId) return;
    supabase.from('time_categorias').select('categoria').eq('time_id', timeId)
      .then(({ data }) => setCatsDoTime((data ?? []).map((c) => c.categoria)));
    // Mantém o campeonato escolhido só se ele for deste time
    setCampId((c) => (d.campeonatos.some((x) => x.id === c && x.time_id === timeId) ? c : ''));
  }, [timeId, d.campeonatos]);

  // Modo edição: preenche a tela com o jogo salvo
  useEffect(() => {
    if (!jogoId || carregouEdicao || d.carregando) return;
    const g = d.jogos.find((x) => x.id === jogoId);
    if (!g) return;
    setTimeId(g.time_id);
    setCategoria(g.categoria);
    setTipo(g.tipo);
    setCampId(g.campeonato_id ?? '');
    setFase(g.fase ?? '');
    setDataHora(paraCampoData(new Date(g.data_hora)));
    setAdversario(g.adversario);
    setLocal(g.local ?? '');
    setCasaFora(g.casa_fora ?? '');
    setGolsPro(g.gols_pro);
    setGolsContra(g.gols_contra);
    setResumo(g.resumo ?? '');
    const novo: Record<string, Part> = {};
    const doJogo = d.participacoes.filter((x) => x.jogo_id === g.id);
    for (const v of d.vinculos.filter((v) => v.time_id === g.time_id)) {
      const x = doJogo.find((y) => y.jogador_id === v.jogador_id);
      novo[v.jogador_id] = x
        ? { jogou: true, gols: x.gols, assistencias: x.assistencias, amarelos: x.amarelos, vermelho: x.vermelho, suspenso_proximo: x.suspenso_proximo, titular: x.titular, craque_do_jogo: x.craque_do_jogo, observacao: x.observacao ?? '' }
        : { ...partVazia(), jogou: false };
    }
    setParts(novo);
    setCarregouEdicao(true);
  }, [jogoId, carregouEdicao, d.carregando, d.jogos, d.participacoes, d.vinculos]);

  const elenco: Jogador[] = useMemo(() => {
    const ids = new Set(d.vinculos.filter((v) => v.time_id === timeId && v.status === 'ativo').map((v) => v.jogador_id));
    // Só os jogadores que eu posso lançar (família convidada só para ver fica de fora)
    return d.jogadores.filter((j) => ids.has(j.id) && (podeEditar(d, j.id) || time?.dono_id === d.meuId));
  }, [d, timeId, time]);

  // Categorias oferecidas: as do time do técnico, ou as que o elenco pode jogar
  const categorias = useMemo(() => {
    if (catsDoTime.length) return catsDoTime;
    const set = new Set(elenco.flatMap((j) => categoriasElegiveis(j.data_nascimento, temporada)));
    return todasCategorias().filter((c) => set.has(c));
  }, [catsDoTime, elenco, temporada]);

  useEffect(() => {
    if (categorias.length && !categorias.includes(categoria)) {
      const natural = elenco[0] ? categoriaNatural(elenco[0].data_nascimento, temporada) : categorias[0];
      setCategoria(categorias.includes(natural) ? natural : categorias[0]);
    }
  }, [categorias, categoria, elenco, temporada]);

  // Na escalação só aparecem os elegíveis para a categoria do jogo
  const elegiveis = elenco.filter((j) => podeJogar(j.data_nascimento, categoria, temporada));
  const campsDoTime = d.campeonatos.filter((c) => c.time_id === timeId);
  const p = (id: string) => parts[id] ?? partVazia();
  const setP = (id: string, mud: Partial<Part>) => setParts((ps) => ({ ...ps, [id]: { ...(ps[id] ?? partVazia()), ...mud } }));

  // Modo ao vivo: placar e números saem dos eventos
  function registrar(ev: Evento) {
    setEventos((es) => [...es, ev]);
    if (ev.tipo === 'gol_adv') setGolsContra((g) => g + 1);
    else if (ev.tipo === 'gol_time') setGolsPro((g) => g + 1);
    else if (ev.tipo === 'gol') { setGolsPro((g) => g + 1); setP(ev.jogador, { gols: p(ev.jogador).gols + 1, jogou: true }); }
    else if (ev.tipo === 'assist') setP(ev.jogador, { assistencias: p(ev.jogador).assistencias + 1, jogou: true });
    else if (ev.tipo === 'amarelo') setP(ev.jogador, { amarelos: Math.min(2, p(ev.jogador).amarelos + 1) });
    else if (ev.tipo === 'vermelho') setP(ev.jogador, { vermelho: true });
  }
  function desfazer() {
    const ev = eventos[eventos.length - 1];
    if (!ev) return;
    setEventos((es) => es.slice(0, -1));
    if (ev.tipo === 'gol_adv') setGolsContra((g) => g - 1);
    else if (ev.tipo === 'gol_time') setGolsPro((g) => g - 1);
    else if (ev.tipo === 'gol') { setGolsPro((g) => g - 1); setP(ev.jogador, { gols: p(ev.jogador).gols - 1 }); }
    else if (ev.tipo === 'assist') setP(ev.jogador, { assistencias: p(ev.jogador).assistencias - 1 });
    else if (ev.tipo === 'amarelo') setP(ev.jogador, { amarelos: p(ev.jogador).amarelos - 1 });
    else if (ev.tipo === 'vermelho') setP(ev.jogador, { vermelho: false });
  }

  function validar(): string | null {
    if (!time) return 'Escolha o time.';
    if (!categoria) return 'Escolha a categoria.';
    if (!adversario.trim()) return 'Informe o adversário.';
    if (tipo === 'campeonato' && !campId && !novoCamp?.trim()) return 'Escolha o campeonato ou crie um novo.';
    const golsDosMeus = elegiveis.reduce((s, j) => s + (p(j.id).jogou ? p(j.id).gols : 0), 0);
    if (golsDosMeus > golsPro) return `Os gols dos jogadores (${golsDosMeus}) passam do placar do time (${golsPro}).`;
    return null;
  }

  async function salvar() {
    const msg = validar();
    if (msg) return setErro(msg);
    setSalvando(true);
    setErro(null);
    try {
      let campeonato_id = tipo === 'campeonato' ? campId : '';
      if (tipo === 'campeonato' && !campId && novoCamp) {
        const r = await supabase.from('campeonatos').insert({ time_id: timeId, nome: novoCamp.trim(), temporada, categoria }).select('id').single();
        if (r.error) throw r.error;
        campeonato_id = r.data.id;
      }
      const jogo = {
        resumo: resumo.trim(),
        time_id: timeId, categoria, data_hora: new Date(dataHora).toISOString(), adversario: adversario.trim(), tipo,
        campeonato_id, fase: tipo === 'campeonato' ? fase : '', local, casa_fora: casaFora, gols_pro: golsPro, gols_contra: golsContra, ao_vivo: aoVivo,
      };
      const participacoes = elegiveis.filter((j) => p(j.id).jogou).map((j) => {
        const { jogou: _jogou, ...resto } = p(j.id);
        return { jogador_id: j.id, ...resto };
      });
      if (jogoId) {
        const { error } = await supabase.rpc('editar_jogo', { p_jogo_id: jogoId, p_jogo: jogo, p_participacoes: participacoes });
        if (error) throw /editar_jogo/.test(error.message) ? new Error('Falta rodar o SQL novo no Supabase para liberar a edição de jogos.') : error;
        nav(`/jogo/${jogoId}`, { replace: true });
        return;
      }
      const { data: novoId, error } = await supabase.rpc('lancar_jogo', { p_jogo: jogo, p_participacoes: participacoes });
      if (error) throw error;
      if (resumo.trim()) await supabase.from('jogos').update({ resumo: resumo.trim() }).eq('id', novoId);
      nav(`/jogo/${novoId}`, { replace: true });
    } catch (e) {
      setErro(mensagemDeErro(e));
      setSalvando(false);
    }
  }

  async function trocarEscudoAdversario(arq: File) {
    const nome = adversario.trim();
    if (!nome) return setErro('Digite o nome do adversário antes de escolher o escudo.');
    setEnviandoEscudo(true);
    setErro(null);
    try {
      await salvarEscudoAdversario(d.adversarios, d.meuId, nome, arq);
      await d.recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviandoEscudo(false);
    }
  }

  if (d.carregando || (jogoId && !carregouEdicao)) return <main className="tela" aria-busy="true" />;
  if (!d.times.length)
    return (
      <main className="tela">
        <Topo titulo="Lançar jogo" voltar={false} />
        <div className="vazio">
          <div className="bola" aria-hidden="true">🛡️</div>
          <h3>Primeiro, crie um time</h3>
          <p className="muted small">O jogo é lançado para um time. Crie o time e coloque o jogador nele.</p>
          <Link className="btn btn-primario" to="/times/novo">Criar time</Link>
        </div>
      </main>
    );

  const r = resultado(golsPro, golsContra);
  const nomeTime = time?.nome ?? 'Time';

  if (aoVivo) {
    return (
      <main className="tela sem-menu">
        <Topo titulo="Ao vivo" voltar={false}>
          <span className="etiqueta" style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}>● AO VIVO</span>
        </Topo>
        <section className="cartao placar" aria-live="polite">
          <div><p className="muted small">{nomeTime}</p><div className="gols">{golsPro}</div></div>
          <div className="muted">×</div>
          <div><p className="muted small">{adversario}</p><div className="gols">{golsContra}</div></div>
        </section>
        {elegiveis.map((j) => {
          const primeiro = chamarDe(j);
          return (
            <section key={j.id} className="pilha">
              <button className="btn btn-primario ao-vivo-btn" onClick={() => registrar({ tipo: 'gol', jogador: j.id })}>
                ⚽ Gol do {primeiro} <span className="num">({p(j.id).gols})</span>
              </button>
              <div className="grade-2">
                <button className="btn btn-fantasma" onClick={() => registrar({ tipo: 'assist', jogador: j.id })}>Assistência ({p(j.id).assistencias})</button>
                <button className="btn btn-fantasma" onClick={() => registrar({ tipo: p(j.id).amarelos ? 'vermelho' : 'amarelo', jogador: j.id })} disabled={p(j.id).vermelho}>
                  <i className={'cartao-ico ' + (p(j.id).amarelos ? 'vm' : 'am')} /> Cartão {p(j.id).amarelos ? 'vermelho' : 'amarelo'}
                </button>
              </div>
            </section>
          );
        })}
        <div className="grade-2">
          <button className="btn btn-fantasma" onClick={() => registrar({ tipo: 'gol_time' })}>+ Gol do {nomeTime}</button>
          <button className="btn btn-fantasma" onClick={() => registrar({ tipo: 'gol_adv' })}>+ Gol do adversário</button>
        </div>
        <button className="link" onClick={desfazer} disabled={!eventos.length}>Desfazer último lance</button>
        <Erro msg={erro} />
        <button className="btn btn-contorno" onClick={() => setAoVivo(false)}>Encerrar e revisar</button>
      </main>
    );
  }

  return (
    <main className="tela">
      <Topo titulo={jogoId ? 'Editar jogo' : 'Lançar jogo'} voltar={!!jogoId} />

      <label className="campo">
        Nosso time
        <select id="lj-time" value={timeId} onChange={(e) => { setTimeId(e.target.value); setParts({}); }}>
          {d.times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </label>
      {time && (
        <div className="linha">
          <Escudo nome={time.nome} url={time.escudo_url} cor={time.cor} tamanho={44} />
          {time.dono_id === d.meuId ? (
            <EscolherImagem id="escudo-nosso" desativado={enviandoEscudo} onArquivo={async (arq) => {
              setEnviandoEscudo(true); setErro(null);
              try { await salvarEscudoTime(time.id, arq); await d.recarregar(); } catch (e) { setErro(mensagemDeErro(e)); } finally { setEnviandoEscudo(false); }
            }}>{enviandoEscudo ? 'Enviando…' : time.escudo_url ? 'Trocar escudo do nosso time' : '+ Escudo do nosso time'}</EscolherImagem>
          ) : (
            <span className="muted small">Escudo cadastrado pelo técnico</span>
          )}
        </div>
      )}

      <fieldset className="pilha" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="selo" style={{ marginBottom: 8 }}>Categoria disputada (Sub-10, Sub-11…)</legend>
        <div className="chips">
          {categorias.map((c) => <button key={c} type="button" className="chip" aria-pressed={categoria === c} onClick={() => setCategoria(c)}>{c}</button>)}
        </div>
        {!categorias.length && (
          <div className="aviso pilha">
            <b style={{ color: 'var(--text)' }}>Nenhum jogador seu está no elenco do {time?.nome}.</b>
            <span>Toque no jogador para colocá-lo neste time. Depois as categorias aparecem aqui.</span>
            <div className="chips">
              {d.jogadores.filter((j) => !d.vinculos.some((v) => v.jogador_id === j.id && v.time_id === timeId)).map((j) => (
                <button key={j.id} type="button" className="chip" onClick={async () => {
                  const { error } = await supabase.from('jogador_times').insert({ jogador_id: j.id, time_id: timeId });
                  if (error) setErro(time?.tipo === 'tecnico' ? 'Para entrar no time de um técnico, use o código do time em Times → Entrar no time de um técnico.' : mensagemDeErro(error));
                  else d.recarregar();
                }}>+ {chamarDe(j)}</button>
              ))}
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="pilha" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="selo" style={{ marginBottom: 8 }}>Tipo</legend>
        <div className="chips">
          {([['amistoso', 'Amistoso'], ['treino', 'Treino / coletivo'], ['campeonato', 'Campeonato']] as const).map(([k, v]) => (
            <button key={k} type="button" className="chip" aria-pressed={tipo === k} onClick={() => setTipo(k)}>{v}</button>
          ))}
        </div>
      </fieldset>

      {tipo === 'campeonato' && (
        <div className="cartao pilha">
          {novoCamp === null ? (
            <>
              <select id="lj-camp" value={campId} onChange={(e) => setCampId(e.target.value)} aria-label="Campeonato">
                <option value="">Escolha o campeonato</option>
                {campsDoTime.map((c) => <option key={c.id} value={c.id}>{c.nome} {c.temporada}</option>)}
              </select>
              <button type="button" className="btn btn-fantasma" onClick={() => { setNovoCamp(''); setCampId(''); }}>+ Novo campeonato</button>
            </>
          ) : (
            <>
              <input id="lj-novo-camp" placeholder={`Nome do campeonato (ex.: Copa Brasília)`} value={novoCamp} onChange={(e) => setNovoCamp(e.target.value)} aria-label="Nome do novo campeonato" />
              <p className="muted small">Temporada {temporada} · {categoria}</p>
              {campsDoTime.length > 0 && <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setNovoCamp(null)}>Escolher um existente</button>}
            </>
          )}
          <select id="lj-fase" value={fase} onChange={(e) => setFase(e.target.value)} aria-label="Fase">
            <option value="">Fase do campeonato (opcional)</option>
            {FASES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      )}

      <div className="grade-2">
        <label className="campo" style={{ gridColumn: '1 / -1' }}>
          Adversário
          <input id="lj-adv" required list="lista-adversarios" autoComplete="off" value={adversario} onChange={(e) => setAdversario(e.target.value)} />
          <datalist id="lista-adversarios">
            {[...new Set([...d.adversarios.map((a) => a.nome), ...d.jogos.map((g) => g.adversario)])].sort().map((n) => <option key={n} value={n} />)}
          </datalist>
        </label>
        {adversario.trim() && (
          <div className="linha" style={{ gridColumn: '1 / -1' }}>
            <Escudo nome={adversario} url={escudoDoAdversario(d, adversario)} tamanho={44} />
            <EscolherImagem id="escudo-adv" desativado={enviandoEscudo} onArquivo={trocarEscudoAdversario}>
              {enviandoEscudo ? 'Enviando…' : escudoDoAdversario(d, adversario) ? 'Trocar escudo do adversário' : '+ Escudo do adversário'}
            </EscolherImagem>
          </div>
        )}
        <label className="campo" style={{ gridColumn: '1 / -1' }}>
          Data e horário
          <input id="lj-data" type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} />
        </label>
        <div className="chips" style={{ gridColumn: '1 / -1' }}>
          <button type="button" className="chip" aria-pressed={casaFora === 'casa'} onClick={() => setCasaFora(casaFora === 'casa' ? '' : 'casa')}>Em casa</button>
          <button type="button" className="chip" aria-pressed={casaFora === 'fora'} onClick={() => setCasaFora(casaFora === 'fora' ? '' : 'fora')}>Fora</button>
        </div>
        <label className="campo" style={{ gridColumn: '1 / -1' }}>
          Quadra ou campo (opcional)
          <input id="lj-local" value={local} onChange={(e) => setLocal(e.target.value)} />
        </label>
      </div>

      {!jogoId && (
        <button type="button" className="btn btn-contorno ao-vivo-btn" onClick={() => { if (!adversario.trim()) return setErro('Informe o adversário para começar ao vivo.'); setErro(null); setAoVivo(true); }}>
          ● Começar modo ao vivo
        </button>
      )}

      <section className="cartao placar" aria-label="Placar">
        <div><p className="muted small">{nomeTime}</p><Contador valor={golsPro} onChange={setGolsPro} rotulo={`gols do ${nomeTime}`} /></div>
        <span className={'res res-' + r} aria-label={r === 'V' ? 'Vitória' : r === 'E' ? 'Empate' : 'Derrota'}>{r}</span>
        <div><p className="muted small">{adversario || 'Adversário'}</p><Contador valor={golsContra} onChange={setGolsContra} rotulo="gols do adversário" /></div>
      </section>

      <h2>Jogadores</h2>
      {elegiveis.length === 0 && <p className="muted small">Nenhum jogador seu neste time pode jogar no {categoria}.</p>}
      {elenco.filter((j) => !elegiveis.includes(j)).map((j) => (
        <p key={j.id} className="muted small">{j.nome} não aparece: é {categoriaNatural(j.data_nascimento, temporada)} e não pode jogar abaixo.</p>
      ))}
      {elegiveis.map((j) => {
        const x = p(j.id);
        return (
          <section key={j.id} className="cartao pilha">
            <label className="toggle">
              <b>{j.nome}</b>
              <input type="checkbox" id={`lj-jogou-${j.id}`} checked={x.jogou} onChange={(e) => setP(j.id, { jogou: e.target.checked })} aria-label={`${j.nome} jogou`} />
            </label>
            {x.jogou && (
              <>
                <div className="linha"><span className="cresce">Gols</span><Contador valor={x.gols} onChange={(n) => { setP(j.id, { gols: n }); const outros = elegiveis.reduce((t, o) => t + (o.id !== j.id && p(o.id).jogou ? p(o.id).gols : 0), 0); if (outros + n > golsPro) setGolsPro(outros + n); }} rotulo={`gols de ${j.nome}`} /></div>
                <div className="linha"><span className="cresce">Assistências</span><Contador valor={x.assistencias} onChange={(n) => setP(j.id, { assistencias: n })} rotulo={`assistências de ${j.nome}`} /></div>
                <div className="linha"><span className="cresce"><i className="cartao-ico am" /> Amarelos</span><Contador valor={x.amarelos} max={2} onChange={(n) => setP(j.id, { amarelos: n })} rotulo={`amarelos de ${j.nome}`} /></div>
                <div className="chips">
                  <button type="button" className="chip" aria-pressed={x.vermelho} onClick={() => setP(j.id, { vermelho: !x.vermelho, suspenso_proximo: !x.vermelho && x.suspenso_proximo })}>
                    <i className="cartao-ico vm" /> Vermelho
                  </button>
                  {x.vermelho && (
                    <button type="button" className="chip" aria-pressed={x.suspenso_proximo} onClick={() => setP(j.id, { suspenso_proximo: !x.suspenso_proximo })}>Suspenso no próximo</button>
                  )}
                  <button type="button" className="chip" aria-pressed={x.titular} onClick={() => setP(j.id, { titular: !x.titular })}>{x.titular ? 'Titular' : 'Reserva'}</button>
                  <button type="button" className="chip" aria-pressed={x.craque_do_jogo} onClick={() => setP(j.id, { craque_do_jogo: !x.craque_do_jogo })}>⭐ Craque do jogo</button>
                </div>
                <input id={`lj-obs-${j.id}`} placeholder="Como foi o gol / observação (opcional)" value={x.observacao} onChange={(e) => setP(j.id, { observacao: e.target.value })} aria-label={`Observação sobre ${j.nome}`} />
              </>
            )}
          </section>
        );
      })}

      <label className="campo">
        Resumo do jogo (opcional)
        <textarea id="lj-resumo" rows={4} placeholder="Como foi a partida, como saíram os gols, destaques…" value={resumo} onChange={(e) => setResumo(e.target.value)} />
      </label>

      {time?.tipo === 'tecnico' && (
        <p className="aviso">Se o técnico lançar este mesmo jogo, a versão dele passa a valer como oficial e você recebe um aviso das diferenças.</p>
      )}
      <Erro msg={erro} />
      <button className="btn btn-primario" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : jogoId ? 'Salvar alterações' : 'Salvar jogo'}</button>
    </main>
  );
}
