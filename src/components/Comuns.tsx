import { useNavigate } from 'react-router-dom';
import { iniciais, type Jogador } from '../lib/tipos';

export function Topo({ titulo, voltar = true, children }: { titulo: string; voltar?: boolean; children?: React.ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="topo">
      {voltar && (
        <button className="voltar" onClick={() => nav(-1)} aria-label="Voltar">
          ←
        </button>
      )}
      <h1>{titulo}</h1>
      {children}
    </header>
  );
}

export function Avatar({ jogador, grande, numero }: { jogador: Pick<Jogador, 'nome' | 'foto_url'>; grande?: boolean; numero?: number | null }) {
  return (
    <div className={'avatar' + (grande ? ' grande' : '')}>
      {jogador.foto_url ? <img src={jogador.foto_url} alt="" /> : numero != null && !grande ? numero : iniciais(jogador.nome)}
    </div>
  );
}

export function Resultado({ r }: { r: 'V' | 'E' | 'D' }) {
  const nome = r === 'V' ? 'Vitória' : r === 'E' ? 'Empate' : 'Derrota';
  return (
    <span className={'res res-' + r} title={nome} aria-label={nome}>
      {r}
    </span>
  );
}

export function Erro({ msg }: { msg: string | null }) {
  return msg ? (
    <div className="erro" role="alert">
      {msg}
    </div>
  ) : null;
}

export function Contador({ valor, onChange, max, rotulo }: { valor: number; onChange: (n: number) => void; max?: number; rotulo: string }) {
  return (
    <div className="contador" role="group" aria-label={rotulo}>
      <button type="button" onClick={() => onChange(Math.max(0, valor - 1))} aria-label={`Diminuir ${rotulo}`}>
        −
      </button>
      <b className="num">{valor}</b>
      <button type="button" onClick={() => onChange(max == null ? valor + 1 : Math.min(max, valor + 1))} aria-label={`Aumentar ${rotulo}`}>
        +
      </button>
    </div>
  );
}

export function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}
