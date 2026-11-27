import { Link } from 'react-router-dom';
import { Avatar } from './Comuns';
import type { Jogador } from '../lib/tipos';

/** Faixa no topo: de qual jogador é esta tela, com a opção de trocar. */
export function FaixaJogador({ jogador, jogadores, onTrocar }: { jogador: Jogador; jogadores: Jogador[]; onTrocar: (id: string | null) => void }) {
  return (
    <div className="faixa-jogador">
      <Link to={`/jogador/${jogador.id}`} className="linha" style={{ gap: 10, color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
        <Avatar jogador={jogador} />
        <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jogador.apelido}</b>
      </Link>
      {jogadores.length > 1 && <button className="chip" onClick={() => onTrocar(null)}>Trocar jogador</button>}
    </div>
  );
}

/** Quando há mais de um jogador e nenhum foi escolhido: pede para escolher antes de seguir. */
export function EscolherJogador({ jogadores, onEscolher, titulo }: { jogadores: Jogador[]; onEscolher: (id: string) => void; titulo: string }) {
  return (
    <section className="pilha">
      <p className="aviso">Escolha o jogador para ver {titulo}.</p>
      {jogadores.map((j) => (
        <button key={j.id} className="cartao clicavel linha" style={{ font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }} onClick={() => onEscolher(j.id)}>
          <Avatar jogador={j} />
          <b className="cresce">{j.apelido}</b>
          <span className="seta" aria-hidden="true">›</span>
        </button>
      ))}
    </section>
  );
}
