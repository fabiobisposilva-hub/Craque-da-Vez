import { Escudo, Resultado } from './Comuns';
import type { Jogo, Time } from '../lib/tipos';

export function ehFuturo(jogo: Pick<Jogo, 'data_hora'>, agora = Date.now()) {
  return new Date(jogo.data_hora).getTime() > agora;
}

/** "Sáb, 30/11 · 13h00" */
export function dataDoJogo(iso: string) {
  const d = new Date(iso);
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  return `${dia[0].toUpperCase()}${dia.slice(1)}, ${data} · ${hora}`;
}

/** Quanto falta: "Hoje", "Amanhã", "Em 5 dias". */
export function quantoFalta(iso: string, agora = new Date()) {
  const zero = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dias = Math.round((zero(new Date(iso)) - zero(agora)) / 86400000);
  if (dias <= 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  return `Em ${dias} dias`;
}

/** Selo grande de jogo agendado, com a data. */
export function SeloAgendado({ data }: { data: string }) {
  return (
    <div className="selo-agendado">
      <span className="selo-agendado-palavra">📅 Agendado</span>
      <span className="selo-agendado-data">{dataDoJogo(data)}</span>
      <span className="selo-agendado-falta">{quantoFalta(data)}</span>
    </div>
  );
}

/** Nosso time × adversário, com os dois escudos e o placar (ou "vs" se o jogo ainda não aconteceu). */
export function Confronto({ jogo, time, escudoAdversario }: {
  jogo: Pick<Jogo, 'gols_pro' | 'gols_contra' | 'resultado' | 'adversario' | 'data_hora' | 'penaltis' | 'penaltis_pro' | 'penaltis_contra'>;
  time?: Pick<Time, 'nome' | 'escudo_url' | 'cor'> | null;
  escudoAdversario: string | null;
}) {
  const futuro = ehFuturo(jogo);
  return (
    <div className="confronto">
      <div className="confronto-lado">
        <Escudo nome={time?.nome ?? '?'} url={time?.escudo_url} cor={time?.cor} tamanho={40} />
        <span className="confronto-nome">{time?.nome ?? 'Nosso time'}</span>
      </div>
      <div className="confronto-meio">
        {futuro ? (
          <b className="confronto-vs">vs</b>
        ) : (
          <>
            <b className="num confronto-placar">{jogo.gols_pro} × {jogo.gols_contra}</b>
            {jogo.penaltis && jogo.penaltis_pro != null && jogo.penaltis_contra != null && (
              <span className="penaltis-mini">({jogo.penaltis_pro} × {jogo.penaltis_contra} pên.)</span>
            )}
            <Resultado r={jogo.resultado} />
          </>
        )}
      </div>
      <div className="confronto-lado">
        <Escudo nome={jogo.adversario} url={escudoAdversario} tamanho={40} />
        <span className="confronto-nome">{jogo.adversario}</span>
      </div>
    </div>
  );
}
