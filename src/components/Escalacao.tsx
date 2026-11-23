import { POSICOES, type Colega, type Escalado } from '../lib/tipos';

type Modalidade = keyof typeof POSICOES;

/** Escalação montada na hora: uma linha para cada posição da modalidade. */
export function escalacaoInicial(modalidade: Modalidade): Escalado[] {
  return POSICOES[modalidade].map((posicao) => ({ nome: '', posicao, numero: null, titular: true }));
}

/** Editor da escalação do jogo (opcional): posição, nome e número de quem jogou. */
export function EditorEscalacao({ modalidade, valor, onChange, colegas }: {
  modalidade: Modalidade;
  valor: Escalado[];
  onChange: (v: Escalado[]) => void;
  colegas: Colega[];
}) {
  const posicoes = POSICOES[modalidade];
  const usados = new Set(valor.map((e) => e.nome.trim().toLowerCase()).filter(Boolean));
  const livres = colegas.filter((c) => !usados.has(c.nome.trim().toLowerCase()));
  const muda = (i: number, m: Partial<Escalado>) => onChange(valor.map((e, k) => (k === i ? { ...e, ...m } : e)));

  function adicionarColega(c: Colega) {
    // Preenche a primeira linha vazia da mesma posição; se não houver, cria uma nova
    const i = valor.findIndex((e) => !e.nome.trim() && (!c.posicao || e.posicao === c.posicao));
    const novo = { nome: c.nome, posicao: c.posicao ?? valor[i]?.posicao ?? posicoes[0], numero: c.numero, titular: i >= 0 ? valor[i].titular : true };
    if (i >= 0) muda(i, novo);
    else onChange([...valor, novo]);
  }

  if (!valor.length)
    return (
      <section className="cartao pilha">
        <h3>Escalação do jogo <span className="muted small">(opcional)</span></h3>
        <p className="muted small">Coloque quem jogou em cada posição ({posicoes.join(', ').toLowerCase()}), inclusive os colegas que não têm conta no app.</p>
        <button type="button" className="btn btn-fantasma" onClick={() => onChange(escalacaoInicial(modalidade))}>+ Montar escalação</button>
      </section>
    );

  const linha = (e: Escalado, i: number) => (
    <div key={i} className="escalado">
      <select id={`esc-pos-${i}`} aria-label="Posição" value={e.posicao} onChange={(ev) => muda(i, { posicao: ev.target.value })}>
        {[...new Set([...posicoes, e.posicao])].map((p) => <option key={p}>{p}</option>)}
      </select>
      <input id={`esc-nome-${i}`} aria-label={`Nome do ${e.posicao}`} placeholder="Nome" list="lista-colegas" autoComplete="off" value={e.nome}
        onChange={(ev) => {
          const nome = ev.target.value;
          const c = colegas.find((x) => x.nome.trim().toLowerCase() === nome.trim().toLowerCase());
          muda(i, c ? { nome, numero: e.numero ?? c.numero } : { nome });
        }} />
      <input id={`esc-num-${i}`} aria-label="Número da camisa" placeholder="Nº" type="number" inputMode="numeric" min={0} max={99}
        value={e.numero ?? ''} onChange={(ev) => muda(i, { numero: ev.target.value === '' ? null : Number(ev.target.value) })} />
      <button type="button" className="remover" aria-label={`Remover ${e.nome || e.posicao}`} onClick={() => onChange(valor.filter((_, k) => k !== i))}>✕</button>
    </div>
  );

  const titulares = valor.map((e, i) => ({ e, i })).filter((x) => x.e.titular);
  const reservas = valor.map((e, i) => ({ e, i })).filter((x) => !x.e.titular);

  return (
    <section className="cartao pilha">
      <div className="secao-titulo">
        <h3>Escalação do jogo</h3>
        <button type="button" className="link" onClick={() => onChange([])}>Limpar</button>
      </div>
      <datalist id="lista-colegas">
        {colegas.map((c) => <option key={c.id} value={c.nome} />)}
      </datalist>
      {livres.length > 0 && (
        <div className="pilha" style={{ gap: 6 }}>
          <span className="selo">Toque para escalar</span>
          <div className="chips">
            {livres.map((c) => (
              <button key={c.id} type="button" className="chip" onClick={() => adicionarColega(c)}>
                + {c.nome}{c.posicao ? ` · ${c.posicao}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}
      <span className="selo">Titulares</span>
      {titulares.map(({ e, i }) => linha(e, i))}
      <button type="button" className="link" style={{ alignSelf: 'flex-start' }}
        onClick={() => onChange([...valor, { nome: '', posicao: posicoes[posicoes.length - 1], numero: null, titular: true }])}>+ Titular</button>
      <span className="selo">Reservas</span>
      {reservas.map(({ e, i }) => linha(e, i))}
      <button type="button" className="link" style={{ alignSelf: 'flex-start' }}
        onClick={() => onChange([...valor, { nome: '', posicao: posicoes[0], numero: null, titular: false }])}>+ Reserva</button>
      <p className="muted small">Os nomes novos ficam guardados no elenco do time para os próximos jogos. Os números do Miguel (gols, assistências) continuam no quadro de cada jogador acima.</p>
    </section>
  );
}

/** Escalação na tela do jogo, agrupada em titulares e reservas. */
export function VerEscalacao({ escalacao }: { escalacao: Escalado[] }) {
  const lista = escalacao.filter((e) => e.nome.trim());
  if (!lista.length) return null;
  const grupo = (titulo: string, itens: Escalado[]) =>
    itens.length > 0 && (
      <div className="pilha" style={{ gap: 6 }}>
        <span className="selo">{titulo}</span>
        {itens.map((e, i) => (
          <div key={i} className="linha" style={{ gap: 10 }}>
            <span className="num camisa">{e.numero ?? '–'}</span>
            <b className="cresce">{e.nome}</b>
            <span className="muted small">{e.posicao}</span>
          </div>
        ))}
      </div>
    );
  return (
    <section className="cartao pilha">
      <h3>Escalação</h3>
      {grupo('Titulares', lista.filter((e) => e.titular))}
      {grupo('Reservas', lista.filter((e) => !e.titular))}
    </section>
  );
}
