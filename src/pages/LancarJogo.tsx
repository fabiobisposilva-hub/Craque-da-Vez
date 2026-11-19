import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Contador, Erro, Topo } from '../components/Comuns';
import { categoriaNatural, categoriasElegiveis, podeJogar, resultado, todasCategorias } from '../lib/categorias';
import { useDados } from '../lib/dados';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { FASES, type Jogador } from '../lib/tipos';

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

function agoraLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

type Evento = { tipo: 'gol' | 'assist' | 'amarelo' | 'vermelho'; jogador: string } | { tipo: 'gol_time' | 'gol_adv' };

export function LancarJogo() {
  const nav = useNavigate();
  const d = useDados();
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
    setCampId('');
  }, [timeId]);

  const elenco: Jogador[] = useMemo(() => {
    const ids = new Set(d.vinculos.filter((v) => v.time_id === timeId && v.status === 'ativo').map((v) => v.jogador_id));
    return d.jogadores.filter((j) => ids.has(j.id));
  }, [d.vinculos, d.jogadores, timeId]);

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
        time_id: timeId, categoria, data_hora: new Date(dataHora).toISOString(), adversario: adversario.trim(), tipo,
        campeonato_id, fase: tipo === 'campeonato' ? fase : '', local, casa_fora: casaFora, gols_pro: golsPro, gols_contra: golsContra, ao_vivo: aoVivo,
      };
      const participacoes = elegiveis.filter((j) => p(j.id).jogou).map((j) => {
        const { jogou: _jogou, ...resto } = p(j.id);
        return { jogador_id: j.id, ...resto };
      });
      const { error } = await supabase.rpc('lancar_jogo', { p_jogo: jogo, p_participacoes: participacoes });
      if (error) throw error;
      nav(elegiveis.length === 1 ? `/jogador/${elegiveis[0].id}` : '/jogos', { replace: true });
    } catch (e) {
      setErro(mensagemDeErro(e));
      setSalvando(false);
    }
  }

  if (d.carregando) return <main className="tela" aria-busy="true" />;
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
          const primeiro = j.nome.split(' ')[0];
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
      <Topo titulo="Lançar jogo" voltar={false} />

      <label className="campo">
        Time
        <select id="lj-time" value={timeId} onChange={(e) => { setTimeId(e.target.value); setParts({}); }}>
          {d.times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </label>

      <fieldset className="pilha" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="selo" style={{ marginBottom: 8 }}>Categoria disputada</legend>
        <div className="chips">
          {categorias.map((c) => <button key={c} type="button" className="chip" aria-pressed={categoria === c} onClick={() => setCategoria(c)}>{c}</button>)}
        </div>
        {!categorias.length && <p className="muted small">Coloque um jogador neste time para escolher a categoria.</p>}
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
              <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => { setNovoCamp(''); setCampId(''); }}>+ Novo campeonato</button>
            </>
          ) : (
            <>
              <input id="lj-novo-camp" placeholder={`Nome do campeonato (ex.: Copa Brasília)`} value={novoCamp} onChange={(e) => setNovoCamp(e.target.value)} aria-label="Nome do novo campeonato" />
              <p className="muted small">Temporada {temporada} · {categoria}</p>
              {campsDoTime.length > 0 && <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setNovoCamp(null)}>Escolher um existente</button>}
            </>
          )}
          <select id="lj-fase" value={fase} onChange={(e) => setFase(e.target.value)} aria-label="Fase">
            <option value="">Fase (opcional)</option>
            {FASES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      )}

      <div className="grade-2">
        <label className="campo" style={{ gridColumn: '1 / -1' }}>
          Adversário
          <input id="lj-adv" required value={adversario} onChange={(e) => setAdversario(e.target.value)} />
        </label>
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

      <button type="button" className="btn btn-contorno ao-vivo-btn" onClick={() => { if (!adversario.trim()) return setErro('Informe o adversário para começar ao vivo.'); setErro(null); setAoVivo(true); }}>
        ● Começar modo ao vivo
      </button>

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
                <div className="linha"><span className="cresce">Gols</span><Contador valor={x.gols} onChange={(n) => setP(j.id, { gols: n })} rotulo={`gols de ${j.nome}`} /></div>
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
                <input id={`lj-obs-${j.id}`} placeholder="Observação (opcional)" value={x.observacao} onChange={(e) => setP(j.id, { observacao: e.target.value })} aria-label={`Observação sobre ${j.nome}`} />
              </>
            )}
          </section>
        );
      })}

      {time?.tipo === 'tecnico' && (
        <p className="aviso">Se o técnico lançar este mesmo jogo, a versão dele passa a valer como oficial e você recebe um aviso das diferenças.</p>
      )}
      <Erro msg={erro} />
      <button className="btn btn-primario" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar jogo'}</button>
    </main>
  );
}
