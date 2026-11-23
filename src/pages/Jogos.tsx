import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dataCurta, Escudo, Resultado, Topo } from '../components/Comuns';
import { escudoDoAdversario, useDados } from '../lib/dados';
import { chamarDe, FASES } from '../lib/tipos';

export function Jogos() {
  const d = useDados();
  const nav = useNavigate();
  const [timeId, setTimeId] = useState('');
  const agora = Date.now();
  const jogos = d.jogos.filter((j) => !timeId || j.time_id === timeId);

  return (
    <main className="tela">
      <Topo titulo="Jogos" voltar={false}>
        <Link to="/lancar" className="btn btn-primario btn-pequeno">+ Lançar</Link>
      </Topo>
      {d.times.length > 1 && (
        <div className="chips">
          <button className="chip" aria-pressed={!timeId} onClick={() => setTimeId('')}>Todos</button>
          {d.times.map((t) => <button key={t.id} className="chip" aria-pressed={timeId === t.id} onClick={() => setTimeId(t.id)}>{t.nome}</button>)}
        </div>
      )}
      {!d.carregando && jogos.length === 0 && (
        <div className="vazio">
          <div className="bola" aria-hidden="true">⚽</div>
          <h3>Nenhum jogo lançado</h3>
          <Link className="btn btn-primario" to="/lancar">Lançar jogo</Link>
        </div>
      )}
      {jogos.map((j) => {
        const time = d.times.find((t) => t.id === j.time_id);
        const camp = d.campeonatos.find((c) => c.id === j.campeonato_id);
        const parts = d.participacoes.filter((p) => p.jogo_id === j.id);
        const substituto = j.substituido_por ? d.jogos.find((g) => g.id === j.substituido_por) : null;
        const futuro = new Date(j.data_hora).getTime() > agora;
        return (
          <article key={j.id} className="cartao pilha cartao clicavel" role="link" tabIndex={0} onClick={() => nav(`/jogo/${j.id}`)}
            onKeyDown={(e) => { if (e.key === 'Enter') nav(`/jogo/${j.id}`); }} style={j.substituido_por ? { opacity: 0.7 } : undefined}>
            <div className="linha">
              <Resultado r={j.resultado} />
              <Escudo nome={j.adversario} url={escudoDoAdversario(d, j.adversario)} tamanho={36} />
              <div className="cresce">
                <b className="num">{time?.nome} {j.gols_pro} × {j.gols_contra} {j.adversario}</b>
                <p className="muted small">
                  {dataCurta(j.data_hora)} · {j.categoria} · {camp ? `${camp.nome}${j.fase ? ' · ' + FASES.find(([k]) => k === j.fase)?.[1] : ''}` : j.tipo === 'treino' ? 'Treino' : 'Amistoso'}
                  {j.ao_vivo && ' · ao vivo'}
                  {futuro && ' · agendado'}
                </p>
              </div>
              {time?.tipo === 'tecnico' && (
                <span className="etiqueta">{j.origem === 'tecnico' ? 'Oficial' : j.substituido_por ? 'Substituído' : 'Seu lançamento'}</span>
              )}
            </div>
            {j.resumo && <p className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {j.resumo}</p>}
            {parts.length > 0 && (
              <div className="chips">
                {parts.map((p) => {
                  const jog = d.jogadores.find((x) => x.id === p.jogador_id);
                  const nome = jog ? chamarDe(jog) : '';
                  return (
                    <span key={p.jogador_id} className="etiqueta">
                      {p.craque_do_jogo && <span className="estrela">★</span>}
                      {nome} · {p.gols} gol{p.gols === 1 ? '' : 's'}{p.assistencias ? ` · ${p.assistencias} assist.` : ''}
                      {p.amarelos > 0 && <i className="cartao-ico am" title="Amarelo" />}
                      {p.vermelho && <i className="cartao-ico vm" title="Vermelho" />}
                    </span>
                  );
                })}
              </div>
            )}
            {substituto && (
              <Diferencas
                seu={parts}
                oficial={d.participacoes.filter((p) => p.jogo_id === substituto.id)}
                placarSeu={`${j.gols_pro} × ${j.gols_contra}`}
                placarOficial={`${substituto.gols_pro} × ${substituto.gols_contra}`}
                nomes={(id) => d.jogadores.find((x) => x.id === id)?.nome ?? 'Jogador'}
              />
            )}
          </article>
        );
      })}
    </main>
  );
}

function Diferencas({ seu, oficial, placarSeu, placarOficial, nomes }: {
  seu: { jogador_id: string; gols: number; assistencias: number }[];
  oficial: { jogador_id: string; gols: number; assistencias: number }[];
  placarSeu: string;
  placarOficial: string;
  nomes: (id: string) => string;
}) {
  const difs: string[] = [];
  if (placarSeu !== placarOficial) difs.push(`Placar: você lançou ${placarSeu}, o técnico ${placarOficial}.`);
  for (const s of seu) {
    const o = oficial.find((x) => x.jogador_id === s.jogador_id);
    if (!o) difs.push(`${nomes(s.jogador_id)} não está no lançamento do técnico.`);
    else {
      if (o.gols !== s.gols) difs.push(`${nomes(s.jogador_id)}: ${s.gols} gol(s) no seu, ${o.gols} no do técnico.`);
      if (o.assistencias !== s.assistencias) difs.push(`${nomes(s.jogador_id)}: ${s.assistencias} assistência(s) no seu, ${o.assistencias} no do técnico.`);
    }
  }
  return (
    <div className="aviso">
      <b style={{ color: 'var(--text)' }}>Vale a versão do técnico.</b> {difs.length ? difs.join(' ') : 'Os números são iguais.'}
    </div>
  );
}
