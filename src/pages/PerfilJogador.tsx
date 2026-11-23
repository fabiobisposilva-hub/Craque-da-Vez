import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar, dataCurta, Erro, Resultado, Topo } from '../components/Comuns';
import { categoriaNatural } from '../lib/categorias';
import { useDados } from '../lib/dados';
import { linhasDoJogador, resumir } from '../lib/estatisticas';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { POSICOES, SITUACOES } from '../lib/tipos';

const ROTULO_VIS = { publico: 'Público', aprovados: 'Só aprovados', privado: 'Privado' };
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function PerfilJogador() {
  const { id } = useParams();
  const d = useDados();
  const jogador = d.jogadores.find((j) => j.id === id);
  const [filtro, setFiltro] = useState({ time: '', categoria: '', campeonato: '', temporada: '' });

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
  const titulos = camps.filter((c) => c.situacao === 'campeao' || c.situacao === 'vice');
  const categorias = [...new Set(todas.map((l) => l.jogo.categoria))];
  const temporadas = [...new Set(todas.map((l) => l.jogo.data_hora.slice(0, 4)))].sort().reverse();
  const natural = categoriaNatural(jogador.data_nascimento);
  const maxMes = Math.max(1, ...r.porMes.map((m) => m.gols));
  const temFiltro = Object.values(filtro).some(Boolean);

  return (
    <main className="tela">
      <div className="capa" style={jogador.capa_url ? { backgroundImage: `url(${jogador.capa_url})` } : undefined}>
        <Link to={`/jogador/${jogador.id}/editar`} className="btn btn-fantasma btn-pequeno">
          <Lapis /> Editar perfil
        </Link>
      </div>
      <div className="perfil-cabeca">
        <Avatar jogador={jogador} grande />
        <div className="cresce" style={{ paddingBottom: 4 }}>
          <span className="etiqueta">🔒 {ROTULO_VIS[jogador.visibilidade]}</span>
        </div>
      </div>
      <div className="linha" style={{ alignItems: 'flex-start' }}>
        <div className="cresce">
        <h1>{jogador.nome}</h1>
        {jogador.apelido && <p style={{ fontWeight: 700, color: 'var(--accent-text)' }}>“{jogador.apelido}”</p>}
        <p className="muted">
          {natural} · {jogador.data_nascimento.slice(0, 4)}
          {jogador.perna_dominante && ` · perna ${jogador.perna_dominante}`}
        </p>
        </div>
        <Link to={`/jogador/${jogador.id}/editar`} className="voltar" aria-label="Alterar dados do jogador" title="Alterar dados do jogador" style={{ textDecoration: 'none' }}>
          <Lapis />
        </Link>
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

      <Convites jogadorId={jogador.id} vinculos={vinculos.filter((v) => v.status === 'convidado').map((v) => ({ ...v, time: d.times.find((t) => t.id === v.time_id)?.nome ?? 'Time' }))} onMudou={d.recarregar} />

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

          {titulos.length > 0 && (
            <section className="pilha">
              <h2>Títulos</h2>
              <div className="chips">
                {titulos.map((c) => <span key={c.id} className="etiqueta">{SITUACOES[c.situacao]} · {c.nome} {c.temporada}</span>)}
              </div>
            </section>
          )}

          <section className="cartao">
            <h3 style={{ marginBottom: 12 }}>Últimos jogos</h3>
            {[...linhas].reverse().slice(0, 10).map(({ jogo, part }) => (
              <div key={jogo.id} className="lista-jogo">
                <Resultado r={jogo.resultado} />
                <div className="cresce" style={{ minWidth: 0 }}>
                  <b className="num">{jogo.gols_pro} × {jogo.gols_contra}</b> {jogo.adversario}
                  <p className="muted small">
                    {dataCurta(jogo.data_hora)} · {d.times.find((t) => t.id === jogo.time_id)?.nome} · {jogo.categoria}
                  </p>
                </div>
                <div className="small" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {part.craque_do_jogo && <span className="estrela" title="Craque do jogo">★ </span>}
                  {part.gols > 0 && <span>⚽{part.gols} </span>}
                  {part.assistencias > 0 && <span>🅰{part.assistencias} </span>}
                  {part.amarelos > 0 && <i className="cartao-ico am" title="Amarelo" />}
                  {part.vermelho && <> <i className="cartao-ico vm" title="Vermelho" /></>}
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      <ColocarEmTime jogadorId={jogador.id} jaEsta={vinculos.map((v) => v.time_id)} times={d.times} onMudou={d.recarregar} />
      <Responsaveis jogadorId={jogador.id} />
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

function ColocarEmTime({ jogadorId, jaEsta, times, onMudou }: { jogadorId: string; jaEsta: string[]; times: { id: string; nome: string; modalidade: keyof typeof POSICOES; dono_id: string }[]; onMudou: () => void }) {
  const [meuId, setMeuId] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ time: '', posicao: '', numero: '' });
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeuId(data.user?.id ?? null));
  }, []);
  const opcoes = times.filter((t) => t.dono_id === meuId && !jaEsta.includes(t.id));
  const time = opcoes.find((t) => t.id === f.time);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('jogador_times').insert({
      jogador_id: jogadorId, time_id: f.time, posicao: f.posicao || null, numero_camisa: f.numero === '' ? null : Number(f.numero),
    });
    if (error) return setErro(mensagemDeErro(error));
    setAberto(false);
    setF({ time: '', posicao: '', numero: '' });
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
          <Erro msg={erro} />
          <button className="btn btn-primario" disabled={!f.time}>Salvar</button>
        </>
      )}
      <button type="button" className="link" onClick={() => setAberto(false)}>Cancelar</button>
    </form>
  );
}

function Responsaveis({ jogadorId }: { jogadorId: string }) {
  const [lista, setLista] = useState<{ usuario_id: string; papel: string }[]>([]);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    supabase.from('jogador_responsaveis').select('usuario_id, papel').eq('jogador_id', jogadorId).eq('status', 'ativo')
      .then(({ data }) => setLista(data ?? []));
  }, [jogadorId]);

  async function convidar() {
    setErro(null);
    const { data, error } = await supabase.from('convites_responsavel').insert({ jogador_id: jogadorId }).select('codigo').single();
    if (error) setErro(mensagemDeErro(error));
    else setCodigo(data.codigo);
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo!);
      setCopiado(true);
    } catch {
      /* o código continua visível para copiar à mão */
    }
  }

  return (
    <section className="cartao pilha">
      <div className="secao-titulo">
        <h3>Responsáveis</h3>
        <span className="muted small num">{lista.length} de 4</span>
      </div>
      <p className="muted small">Pai, mãe, avó: até 4 pessoas podem editar este jogador. Cada uma entra com um código que você gera aqui.</p>
      {codigo ? (
        <div className="pilha">
          <div className="linha">
            <b className="num cresce" style={{ fontSize: 26, letterSpacing: '0.12em' }}>{codigo}</b>
            <button className="btn btn-fantasma btn-pequeno" onClick={copiar}>{copiado ? 'Copiado' : 'Copiar'}</button>
          </div>
          <p className="muted small">Vale por 7 dias e uma única vez. A pessoa cria a conta e digita o código em Perfil → Código de convite.</p>
        </div>
      ) : (
        lista.length < 4 && <button className="btn btn-fantasma" onClick={convidar}>Convidar responsável</button>
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
