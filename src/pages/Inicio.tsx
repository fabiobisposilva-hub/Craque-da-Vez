import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, dataCurta, Escudo, Resultado, TipoJogo } from '../components/Comuns';
import { Logo } from '../components/Logo';
import { categoriaNatural } from '../lib/categorias';
import { escudoDoAdversario, useDados } from '../lib/dados';
import { linhasDoJogador, resumir } from '../lib/estatisticas';
import { supabase } from '../lib/supabase';
import { chamarDe, type Notificacao } from '../lib/tipos';

function textoNotificacao(n: Notificacao): string {
  const p = n.payload as Record<string, string | number>;
  if (n.tipo === 'jogo_lancado_tecnico')
    return `O técnico do ${p.time} lançou o jogo contra o ${p.adversario}: ${p.jogador} fez ${p.gols} gol${p.gols === 1 ? '' : 's'}${Number(p.assistencias) ? ` e ${p.assistencias} assistência${p.assistencias === 1 ? '' : 's'}` : ''}.`;
  if (n.tipo === 'divergencia')
    return `O técnico do ${p.time} lançou um jogo que você também tinha lançado. A versão do técnico passou a valer como oficial. Confira as diferenças em Jogos.`;
  return 'Nova notificação.';
}

export function Inicio() {
  const d = useDados();
  const [notas, setNotas] = useState<Notificacao[]>([]);
  useEffect(() => {
    supabase
      .from('notificacoes')
      .select('*')
      .eq('lida', false)
      .order('criado_em', { ascending: false })
      .then(({ data }) => setNotas((data as Notificacao[]) ?? []));
  }, []);

  async function marcarLidas() {
    await supabase.from('notificacoes').update({ lida: true }).in('id', notas.map((n) => n.id));
    setNotas([]);
  }

  return (
    <main className="tela">
      <Logo compacto />
      {notas.length > 0 && (
        <section className="cartao pilha" aria-label="Notificações">
          <div className="secao-titulo">
            <h2>Novidades</h2>
            <button className="link" onClick={marcarLidas}>
              Marcar como lidas
            </button>
          </div>
          {notas.map((n) => (
            <p key={n.id} className="small">
              {textoNotificacao(n)}
            </p>
          ))}
        </section>
      )}

      <div className="secao-titulo">
        <h2>Meus jogadores</h2>
        <Link to="/jogador/novo" className="link">
          + Cadastrar
        </Link>
      </div>
      {d.erro && <div className="erro">{d.erro}</div>}
      {!d.carregando && d.jogadores.length === 0 && (
        <div className="vazio">
          <div className="bola" aria-hidden="true">⚽</div>
          <h3>Cadastre o primeiro jogador</h3>
          <p className="muted small">Pode ser você, se joga, e cada um dos seus filhos. A categoria sai automática pelo ano de nascimento.</p>
          <Link to="/jogador/novo" className="btn btn-primario">
            Cadastrar jogador
          </Link>
          <Link to="/conta#convite" className="link">
            Tenho um código de convite
          </Link>
        </div>
      )}
      {d.jogadores.map((j) => {
        const r = resumir(linhasDoJogador(d.jogos, d.participacoes, j.id), j.data_nascimento);
        const times = d.vinculos.filter((v) => v.jogador_id === j.id && v.status === 'ativo').map((v) => d.times.find((t) => t.id === v.time_id)?.nome).filter(Boolean);
        return (
          <Link key={j.id} to={`/jogador/${j.id}`} className="cartao clicavel">
            <div className="linha">
              <Avatar jogador={j} />
              <div className="cresce">
                <h3>{j.nome}{j.apelido && <span style={{ color: 'var(--accent-text)' }}> “{j.apelido}”</span>}</h3>
                <p className="muted small">
                  {categoriaNatural(j.data_nascimento)} · {times.length ? times.join(' · ') : 'sem time'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <b className="num" style={{ fontSize: 22 }}>{r.gols}</b>
                <p className="muted small">gols</p>
              </div>
            </div>
          </Link>
        );
      })}

      <UltimosJogos d={d} />
    </main>
  );
}

function UltimosJogos({ d }: { d: ReturnType<typeof useDados> }) {
  const agora = Date.now();
  const jogos = d.jogos.filter((g) => !g.substituido_por && new Date(g.data_hora).getTime() <= agora).slice(0, 5);
  if (!jogos.length) return null;
  return (
    <section className="pilha">
      <div className="secao-titulo">
        <h2>Últimos jogos</h2>
        <Link to="/jogos" className="link">Ver todos</Link>
      </div>
      {jogos.map((g) => {
        const time = d.times.find((t) => t.id === g.time_id);
        const camp = d.campeonatos.find((c) => c.id === g.campeonato_id);
        const destaques = d.participacoes
          .filter((p) => p.jogo_id === g.id && (p.gols || p.assistencias || p.craque_do_jogo))
          .map((p) => {
            const j = d.jogadores.find((x) => x.id === p.jogador_id);
            if (!j) return null;
            const itens = [p.gols ? `${p.gols} gol${p.gols > 1 ? 's' : ''}` : '', p.assistencias ? `${p.assistencias} assist.` : ''].filter(Boolean).join(', ');
            return `${p.craque_do_jogo ? '★ ' : ''}${chamarDe(j)}${itens ? `: ${itens}` : ''}`;
          })
          .filter(Boolean);
        return (
          <Link key={g.id} to={`/jogo/${g.id}`} className="cartao clicavel pilha" style={{ gap: 8 }}>
            <div className="linha">
              <Resultado r={g.resultado} />
              <Escudo nome={g.adversario} url={escudoDoAdversario(d, g.adversario)} tamanho={36} />
              <div className="cresce" style={{ minWidth: 0 }}>
                <b className="num">{time?.nome} {g.gols_pro} × {g.gols_contra} {g.adversario}</b>
                <p className="muted small">{dataCurta(g.data_hora)} · {g.categoria}{g.local && ` · 📍 ${g.local}`}</p>
              </div>
            </div>
            <div className="chips" style={{ gap: 6 }}>
              <TipoJogo jogo={g} campeonato={camp} />
              {destaques.map((t) => <span key={t} className="tipo-jogo tipo-amistoso" style={{ color: 'var(--text)' }}>{t}</span>)}
            </div>
          </Link>
        );
      })}
    </section>
  );
}
