import { Link } from 'react-router-dom';
import { TipoJogo, Topo } from '../components/Comuns';
import { Confronto, ehFuturo, SeloAgendado } from '../components/Confronto';
import { EscolherJogador, FaixaJogador } from '../components/JogadorAtivo';
import { useJogadorAtivo } from '../lib/ativo';
import { escudoDoAdversario, useDados } from '../lib/dados';

/** Agenda: próximos jogos do jogador escolhido (o mais perto primeiro). */
export function Agenda() {
  const d = useDados();
  const [ativoId, setAtivo] = useJogadorAtivo(d.jogadores.map((j) => j.id));
  const j = d.jogadores.find((x) => x.id === ativoId);
  const ids = new Set(j ? d.vinculos.filter((v) => v.jogador_id === j.id && v.status === 'ativo').map((v) => v.time_id) : []);
  const jogos = d.jogos.filter((g) => ids.has(g.time_id) && !g.substituido_por && ehFuturo(g)).sort((a, b) => a.data_hora.localeCompare(b.data_hora));

  return (
    <main className="tela">
      <Topo titulo="Agenda" voltar={false}>
        {j && <Link to="/lancar" className="btn btn-primario btn-pequeno">+ Agendar</Link>}
      </Topo>
      {!d.carregando && !j && d.jogadores.length > 1 && <EscolherJogador jogadores={d.jogadores} onEscolher={setAtivo} titulo="a agenda" />}
      {!d.carregando && d.jogadores.length === 0 && <p className="muted">Cadastre um jogador no Início para ter agenda.</p>}
      {j && (
        <>
          <FaixaJogador jogador={j} jogadores={d.jogadores} onTrocar={setAtivo} />
          {!d.carregando && jogos.length === 0 && (
            <div className="vazio">
              <div className="bola" aria-hidden="true">📅</div>
              <h3>Nenhum jogo agendado</h3>
              <p className="muted small">Lance um jogo com data futura e ele aparece aqui.</p>
              <Link to="/lancar" className="btn btn-primario">Agendar jogo</Link>
            </div>
          )}
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
        </>
      )}
    </main>
  );
}
