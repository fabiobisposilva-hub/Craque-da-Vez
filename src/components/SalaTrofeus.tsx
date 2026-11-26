import type { Campeonato } from '../lib/tipos';

/** Sala de troféus: campeonatos que terminaram como campeão (e vice). */
export function SalaTrofeus({ campeonatos, nomeDoTime, vazio }: {
  campeonatos: Campeonato[];
  nomeDoTime?: (timeId: string) => string | undefined;
  vazio?: string;
}) {
  const titulos = campeonatos
    .filter((c) => c.situacao === 'campeao' || c.situacao === 'vice')
    .sort((a, b) => (a.situacao === b.situacao ? b.temporada - a.temporada : a.situacao === 'campeao' ? -1 : 1));
  const campeao = titulos.filter((c) => c.situacao === 'campeao').length;
  if (!titulos.length && !vazio) return null;
  return (
    <section className="cartao pilha">
      <div className="secao-titulo">
        <h2>🏆 Sala de troféus</h2>
        {campeao > 0 && <span className="muted small num">{campeao} título{campeao > 1 ? 's' : ''}</span>}
      </div>
      {titulos.length ? (
        <div className="trofeus">
          {titulos.map((c) => (
            <div key={c.id} className={'trofeu ' + (c.situacao === 'campeao' ? 'trofeu-campeao' : 'trofeu-vice')}>
              <span className="trofeu-icone" aria-hidden="true">{c.situacao === 'campeao' ? '🏆' : '🥈'}</span>
              <span className="trofeu-titulo">{c.nome}</span>
              <small>{c.situacao === 'campeao' ? 'Campeão' : 'Vice-campeão'} · {c.temporada}</small>
              {nomeDoTime && <small>{nomeDoTime(c.time_id)}{c.categoria ? ` · ${c.categoria}` : ''}</small>}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small">{vazio}</p>
      )}
    </section>
  );
}
