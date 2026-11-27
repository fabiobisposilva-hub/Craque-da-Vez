import { Link } from 'react-router-dom';
import { Topo } from '../components/Comuns';
import { Confronto, ehFuturo, SeloAgendado } from '../components/Confronto';
import { TipoJogo } from '../components/Comuns';
import { escudoDoAdversario, useDados } from '../lib/dados';

/** Agenda: só os próximos jogos, separados por jogador (o mais perto primeiro). */
export function Agenda() {
  const d = useDados();
  const grupos = d.jogadores.map((j) => {
    const ids = new Set(d.vinculos.filter((v) => v.jogador_id === j.id && v.status === 'ativo').map((v) => v.time_id));
    const jogos = d.jogos.filter((g) => ids.has(g.time_id) && !g.substituido_por && ehFuturo(g)).sort((a, b) => a.data_hora.localeCompare(b.data_hora));
    return { j, jogos };
  });
  const total = grupos.reduce((s, g) => s + g.jogos.length, 0);

  return (
    <main className="tela">
      <Topo titulo="Agenda" voltar={false}>
        <Link to="/lancar" className="btn btn-primario btn-pequeno">+ Agendar</Link>
      </Topo>
      {!d.carregando && total === 0 && (
        <div className="vazio">
          <div className="bola" aria-hidden="true">📅</div>
          <h3>Nenhum jogo agendado</h3>
          <p className="muted small">Lance um jogo com data futura e ele aparece aqui.</p>
          <Link to="/lancar" className="btn btn-primario">Agendar jogo</Link>
        </div>
      )}
      {grupos.filter((g) => g.jogos.length).map(({ j, jogos }) => (
        <section key={j.id} className="pilha" style={{ gap: 10 }}>
          {d.jogadores.length > 1 && <h2>{j.apelido || j.nome.split(' ')[0]}</h2>}
          {jogos.map((g) => (
            <Link key={g.id} to={`/jogo/${g.id}`} className="cartao clicavel pilha" style={{ gap: 10 }}>
              <SeloAgendado data={g.data_hora} />
              <Confronto jogo={g} time={d.times.find((t) => t.id === g.time_id)} escudoAdversario={escudoDoAdversario(d, g.adversario)} />
              <div className="chips" style={{ gap: 6, justifyContent: 'center' }}>
                <TipoJogo jogo={g} campeonato={d.campeonatos.find((c) => c.id === g.campeonato_id)} />
                <span className="tipo-jogo tipo-amistoso">{g.categoria}</span>
                {g.local && <span className="tipo-jogo tipo-amistoso">📍 {g.local}</span>}
              </div>
            </Link>
          ))}
        </section>
      ))}
      <p className="muted small" style={{ textAlign: 'center' }}>Os jogos já disputados ficam na tela de cada jogador, na aba Jogos.</p>
    </main>
  );
}
