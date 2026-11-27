import { useCallback, useEffect, useState } from 'react';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { nomeParentesco } from '../lib/tipos';

type Curtida = { jogador_id: string; alvo: string; usuario_id: string; nome: string; parentesco: string | null };
type Comentario = Curtida & { id: string; texto: string; criado_em: string };
export type DadosInteracoes = { curtidas: Curtida[]; comentarios: Comentario[] };

/** Curtidas e comentários de um jogo (o banco só devolve os dos atletas da família de quem está vendo). */
export function useInteracoes(jogoId: string | undefined) {
  const [dados, setDados] = useState<DadosInteracoes>({ curtidas: [], comentarios: [] });
  const recarregar = useCallback(async () => {
    if (!jogoId) return;
    const { data } = await supabase.rpc('interacoes_do_jogo', { p_jogo: jogoId });
    if (data) setDados(data as DadosInteracoes);
  }, [jogoId]);
  useEffect(() => { recarregar(); }, [recarregar]);
  return { dados, recarregar };
}

const quem = (c: { nome: string; parentesco: string | null }) => `${c.nome.split(' ')[0]}${c.parentesco ? ` (${nomeParentesco(c.parentesco)})` : ''}`;

/** Botão de curtir + comentários de um item (a partida ou os gols de um atleta). */
export function Interacoes({ jogoId, jogadorId, alvo, meuId, podeApagarTodos, dados, recarregar }: {
  jogoId: string; jogadorId: string; alvo: 'partida' | 'gols'; meuId: string | null; podeApagarTodos: boolean;
  dados: DadosInteracoes; recarregar: () => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [abrir, setAbrir] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const curtidas = dados.curtidas.filter((c) => c.jogador_id === jogadorId && c.alvo === alvo);
  const comentarios = dados.comentarios.filter((c) => c.jogador_id === jogadorId && c.alvo === alvo);
  const curti = curtidas.some((c) => c.usuario_id === meuId);

  async function acao(f: () => PromiseLike<{ error: unknown }>) {
    setOcupado(true); setErro(null);
    const { error } = await f();
    if (error) setErro(mensagemDeErro(error));
    await recarregar();
    setOcupado(false);
  }
  const curtir = () => acao(() => curti
    ? supabase.from('curtidas').delete().match({ jogo_id: jogoId, jogador_id: jogadorId, alvo, usuario_id: meuId })
    : supabase.from('curtidas').insert({ jogo_id: jogoId, jogador_id: jogadorId, alvo }));
  async function comentar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    await acao(() => supabase.from('comentarios').insert({ jogo_id: jogoId, jogador_id: jogadorId, alvo, texto: t }));
    setTexto('');
  }

  return (
    <div className="interacoes">
      <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="chip" aria-pressed={curti} disabled={ocupado} onClick={curtir}>
          {curti ? '❤️' : '🤍'} {curtidas.length > 0 ? curtidas.length : ''} Curtir
        </button>
        <button type="button" className="chip" aria-expanded={abrir} onClick={() => setAbrir(!abrir)}>
          💬 {comentarios.length > 0 ? comentarios.length : ''} Comentar
        </button>
      </div>
      {curtidas.length > 0 && <p className="muted small">❤️ {curtidas.map(quem).join(', ')}</p>}
      {(abrir || comentarios.length > 0) && (
        <div className="pilha" style={{ gap: 6 }}>
          {comentarios.map((c) => (
            <div key={c.id} className="comentario">
              <p className="small"><b>{quem(c)}</b> <span className="muted">· {new Date(c.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></p>
              <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{c.texto}</p>
              {(c.usuario_id === meuId || podeApagarTodos) && (
                <button type="button" className="link small" disabled={ocupado} onClick={() => acao(() => supabase.from('comentarios').delete().eq('id', c.id))}>Apagar</button>
              )}
            </div>
          ))}
          {abrir && (
            <form className="linha" style={{ gap: 6 }} onSubmit={comentar}>
              <input className="cresce" maxLength={500} placeholder="Escreva um comentário" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Comentário" />
              <button className="btn btn-primario btn-pequeno" disabled={ocupado || !texto.trim()}>Enviar</button>
            </form>
          )}
        </div>
      )}
      {erro && <p className="erro small">{erro}</p>}
    </div>
  );
}
