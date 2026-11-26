import type { Cobranca } from '../lib/tipos';

export interface DadosPenaltis {
  penaltis: boolean;
  penaltis_pro: number | null;
  penaltis_contra: number | null;
  cobrancas: Cobranca[];
  goleiro_penaltis: string;
}

export const penaltisVazio = (): DadosPenaltis => ({ penaltis: false, penaltis_pro: null, penaltis_contra: null, cobrancas: [], goleiro_penaltis: '' });

const RESULTADOS: [Cobranca['resultado'], string][] = [['gol', '⚽ Gol'], ['defendido', '🧤 Defendido'], ['fora', '❌ Fora']];

/** Placar da disputa a partir das cobranças. */
export function placarDasCobrancas(c: Cobranca[]) {
  return { pro: c.filter((x) => x.lado === 'nos' && x.resultado === 'gol').length, contra: c.filter((x) => x.lado === 'eles' && x.resultado === 'gol').length };
}

/** Editor da disputa de pênaltis: quem bateu, se foi gol, se o goleiro pegou, e quem venceu. */
export function EditorPenaltis({ valor, onChange, nomeTime, adversario, batedores, goleiroSugerido }: {
  valor: DadosPenaltis;
  onChange: (v: DadosPenaltis) => void;
  nomeTime: string;
  adversario: string;
  batedores: { nome: string; jogador_id?: string }[];
  goleiroSugerido?: string;
}) {
  const set = (m: Partial<DadosPenaltis>) => {
    const novo = { ...valor, ...m };
    if (novo.cobrancas.length) {
      const pl = placarDasCobrancas(novo.cobrancas);
      novo.penaltis_pro = pl.pro;
      novo.penaltis_contra = pl.contra;
    }
    onChange(novo);
  };
  const mudaCobranca = (i: number, m: Partial<Cobranca>) => set({ cobrancas: valor.cobrancas.map((c, k) => (k === i ? { ...c, ...m } : c)) });
  const adicionar = (lado: Cobranca['lado']) => set({ cobrancas: [...valor.cobrancas, { lado, nome: '', resultado: 'gol' }] });

  if (!valor.penaltis)
    return (
      <section className="cartao pilha">
        <h3>Empate no tempo normal</h3>
        <p className="muted small">Teve disputa de pênaltis? Registre quem bateu, as defesas do goleiro e quem venceu.</p>
        <button type="button" className="btn btn-fantasma" onClick={() => set({ penaltis: true, goleiro_penaltis: valor.goleiro_penaltis || goleiroSugerido || '' })}>
          🥅 Foi para os pênaltis
        </button>
      </section>
    );

  const pro = valor.penaltis_pro ?? 0;
  const contra = valor.penaltis_contra ?? 0;
  const vencedor = pro === contra ? null : pro > contra ? nomeTime : adversario || 'Adversário';
  const nossas = valor.cobrancas.map((c, i) => ({ c, i })).filter((x) => x.c.lado === 'nos');
  const deles = valor.cobrancas.map((c, i) => ({ c, i })).filter((x) => x.c.lado === 'eles');

  return (
    <section className="cartao pilha">
      <div className="secao-titulo">
        <h3>🥅 Disputa de pênaltis</h3>
        <button type="button" className="link" onClick={() => onChange(penaltisVazio())}>Tirar pênaltis</button>
      </div>

      <div className="placar-penaltis" aria-live="polite">
        <span>{nomeTime}</span>
        <b className="num">{pro} × {contra}</b>
        <span>{adversario || 'Adversário'}</span>
      </div>
      {valor.cobrancas.length === 0 && (
        <div className="grade-2">
          <label className="campo">Gols nossos<input id="pen-pro" type="number" inputMode="numeric" min={0} value={valor.penaltis_pro ?? ''} onChange={(e) => set({ penaltis_pro: e.target.value === '' ? null : Number(e.target.value) })} /></label>
          <label className="campo">Gols deles<input id="pen-contra" type="number" inputMode="numeric" min={0} value={valor.penaltis_contra ?? ''} onChange={(e) => set({ penaltis_contra: e.target.value === '' ? null : Number(e.target.value) })} /></label>
        </div>
      )}
      <p className={'vencedor-penaltis' + (vencedor === nomeTime ? ' ganhou' : vencedor ? ' perdeu' : '')}>
        {vencedor ? `🏅 ${vencedor} venceu nos pênaltis` : 'Empate nas cobranças: registre as alternadas até alguém vencer'}
      </p>

      <datalist id="lista-batedores">
        {batedores.map((b) => <option key={b.nome} value={b.nome} />)}
      </datalist>

      <span className="selo">Cobranças do {nomeTime}</span>
      {nossas.map(({ c, i }, n) => (
        <div key={i} className="cobranca">
          <span className="num cobranca-n">{n + 1}º</span>
          <input id={`cob-nome-${i}`} aria-label="Quem bateu" placeholder="Quem bateu" list="lista-batedores" autoComplete="off" value={c.nome}
            onChange={(e) => { const b = batedores.find((x) => x.nome === e.target.value); mudaCobranca(i, { nome: e.target.value, jogador_id: b?.jogador_id ?? null }); }} />
          <Resultados valor={c.resultado} onChange={(r) => mudaCobranca(i, { resultado: r })} rotulos={['⚽', '🧤', '❌']} />
          <button type="button" className="remover" aria-label="Remover cobrança" onClick={() => set({ cobrancas: valor.cobrancas.filter((_, k) => k !== i) })}>✕</button>
        </div>
      ))}
      <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => adicionar('nos')}>+ Cobrança nossa</button>

      <span className="selo">Cobranças do {adversario || 'adversário'}</span>
      <label className="campo">
        Nosso goleiro nos pênaltis
        <input id="pen-goleiro" list="lista-batedores" autoComplete="off" placeholder="Nome do goleiro" value={valor.goleiro_penaltis} onChange={(e) => set({ goleiro_penaltis: e.target.value })} />
      </label>
      {deles.map(({ c, i }, n) => (
        <div key={i} className="cobranca">
          <span className="num cobranca-n">{n + 1}º</span>
          <input id={`cob-adv-${i}`} aria-label="Batedor adversário (opcional)" placeholder="Batedor (opcional)" value={c.nome} onChange={(e) => mudaCobranca(i, { nome: e.target.value })} />
          <Resultados valor={c.resultado} onChange={(r) => mudaCobranca(i, { resultado: r })} rotulos={['⚽', '🧤', '❌']} />
          <button type="button" className="remover" aria-label="Remover cobrança" onClick={() => set({ cobrancas: valor.cobrancas.filter((_, k) => k !== i) })}>✕</button>
        </div>
      ))}
      <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => adicionar('eles')}>+ Cobrança deles</button>
      <p className="muted small">⚽ gol · 🧤 o goleiro defendeu · ❌ para fora ou na trave. O placar da disputa soma sozinho.</p>
    </section>
  );
}

function Resultados({ valor, onChange, rotulos }: { valor: Cobranca['resultado']; onChange: (r: Cobranca['resultado']) => void; rotulos: string[] }) {
  return (
    <div className="resultados" role="group" aria-label="Resultado da cobrança">
      {RESULTADOS.map(([k, nome], i) => (
        <button key={k} type="button" className="chip" aria-pressed={valor === k} aria-label={nome} title={nome} onClick={() => onChange(k)}>{rotulos[i]}</button>
      ))}
    </div>
  );
}

/** Disputa na tela do jogo. */
export function VerPenaltis({ jogo, nomeTime }: {
  jogo: { penaltis?: boolean; penaltis_pro?: number | null; penaltis_contra?: number | null; cobrancas?: Cobranca[] | null; goleiro_penaltis?: string | null; adversario: string };
  nomeTime: string;
}) {
  if (!jogo.penaltis) return null;
  const pro = jogo.penaltis_pro ?? 0;
  const contra = jogo.penaltis_contra ?? 0;
  const c = jogo.cobrancas ?? [];
  const simbolo = { gol: '⚽', defendido: '🧤', fora: '❌' } as const;
  const lista = (lado: Cobranca['lado']) => c.filter((x) => x.lado === lado);
  const defesas = lista('eles').filter((x) => x.resultado === 'defendido').length;
  return (
    <section className="cartao pilha">
      <h3>🥅 Disputa de pênaltis</h3>
      <div className="placar-penaltis">
        <span>{nomeTime}</span>
        <b className="num">{pro} × {contra}</b>
        <span>{jogo.adversario}</span>
      </div>
      {pro !== contra && (
        <p className={'vencedor-penaltis ' + (pro > contra ? 'ganhou' : 'perdeu')}>🏅 {pro > contra ? nomeTime : jogo.adversario} venceu nos pênaltis</p>
      )}
      {lista('nos').length > 0 && (
        <div className="pilha" style={{ gap: 4 }}>
          <span className="selo">{nomeTime}</span>
          {lista('nos').map((x, i) => (
            <div key={i} className="linha" style={{ gap: 8 }}><span className="num cobranca-n">{i + 1}º</span><span className="cresce">{x.nome || '—'}</span><span>{simbolo[x.resultado]}</span></div>
          ))}
        </div>
      )}
      {lista('eles').length > 0 && (
        <div className="pilha" style={{ gap: 4 }}>
          <span className="selo">{jogo.adversario}</span>
          {lista('eles').map((x, i) => (
            <div key={i} className="linha" style={{ gap: 8 }}><span className="num cobranca-n">{i + 1}º</span><span className="cresce">{x.nome || 'Cobrança'}</span><span>{simbolo[x.resultado]}</span></div>
          ))}
        </div>
      )}
      {jogo.goleiro_penaltis && (
        <p className="small">🧤 <b>{jogo.goleiro_penaltis}</b> no gol{defesas ? `: ${defesas} defesa${defesas > 1 ? 's' : ''}` : ''}</p>
      )}
    </section>
  );
}
