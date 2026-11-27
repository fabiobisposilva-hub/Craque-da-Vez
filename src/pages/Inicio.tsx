import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Erro, EscolherImagem, Escudo, Rodape } from '../components/Comuns';
import { dataDoJogo, ehFuturo } from '../components/Confronto';
import { Logo } from '../components/Logo';
import { categoriaNatural } from '../lib/categorias';
import { useDados } from '../lib/dados';
import { linhasDoJogador, resumir } from '../lib/estatisticas';
import { definirPapel } from '../lib/papel';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { type Notificacao } from '../lib/tipos';

function textoNotificacao(n: Notificacao): string {
  const p = n.payload as Record<string, string | number>;
  if (n.tipo === 'jogo_lancado_tecnico')
    return `O técnico do ${p.time} lançou o jogo contra o ${p.adversario}: ${p.jogador} fez ${p.gols} gol${p.gols === 1 ? '' : 's'}${Number(p.assistencias) ? ` e ${p.assistencias} assistência${p.assistencias === 1 ? '' : 's'}` : ''}.`;
  if (n.tipo === 'divergencia')
    return `O técnico do ${p.time} lançou um jogo que você também tinha lançado. A versão do técnico passou a valer como oficial. Confira as diferenças em Jogos.`;
  return 'Nova notificação.';
}

export function Inicio() {
  const d = useDados();
  const [notas, setNotas] = useState<Notificacao[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    supabase.from('notificacoes').select('*').eq('lida', false).order('criado_em', { ascending: false })
      .then(({ data }) => setNotas((data as Notificacao[]) ?? []));
  }, []);

  async function marcarLidas() {
    await supabase.from('notificacoes').update({ lida: true }).in('id', notas.map((n) => n.id));
    setNotas([]);
  }
  async function trocarPapel(f: File) {
    setEnviando(true); setErro(null);
    try { await definirPapel('inicio', f); } catch (e) { setErro(mensagemDeErro(e)); } finally { setEnviando(false); }
  }

  return (
    <main className="tela">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <EscolherImagem id="papel-inicio" desativado={enviando} onArquivo={trocarPapel}>{enviando ? 'Enviando…' : '🖼️ Papel de parede'}</EscolherImagem>
      </div>
      <Logo />
      <Erro msg={erro} />

      {notas.length > 0 && (
        <section className="cartao pilha" aria-label="Novidades">
          <div className="secao-titulo">
            <h3>🔔 Novidades</h3>
            <button className="link" onClick={marcarLidas}>Ok, vi</button>
          </div>
          {notas.map((n) => <p key={n.id} className="small">{textoNotificacao(n)}</p>)}
        </section>
      )}

      {d.erro && <div className="erro">{d.erro}</div>}
      {!d.carregando && d.jogadores.length === 0 && (
        <div className="vazio">
          <div className="bola" aria-hidden="true">⚽</div>
          <h3>Cadastre o primeiro jogador</h3>
          <p className="muted small">A categoria sai pelo ano de nascimento.</p>
          <Link to="/jogador/novo" className="btn btn-primario">Cadastrar jogador</Link>
          <Link to="/conta#convite" className="link">Tenho um código de convite</Link>
        </div>
      )}

      <div className="pilha" style={{ gap: 14 }}>
        {d.jogadores.map((j) => {
          const r = resumir(linhasDoJogador(d.jogos, d.participacoes, j.id), j.data_nascimento);
          const times = d.vinculos.filter((v) => v.jogador_id === j.id && v.status === 'ativo').map((v) => d.times.find((t) => t.id === v.time_id)).filter((t): t is NonNullable<typeof t> => !!t);
          const ids = new Set(times.map((t) => t.id));
          const proximo = d.jogos.filter((g) => ids.has(g.time_id) && !g.substituido_por && ehFuturo(g)).sort((a, b) => a.data_hora.localeCompare(b.data_hora))[0];
          return (
            <Link key={j.id} to={`/jogador/${j.id}`} className="cartao-jogador">
              <div className="linha" style={{ gap: 14 }}>
                <Avatar jogador={j} grande />
                <div className="cresce" style={{ minWidth: 0 }}>
                  <h2>{j.apelido || j.nome.split(' ')[0]}</h2>
                  <p className="muted small">{categoriaNatural(j.data_nascimento)}</p>
                  <div className="linha" style={{ gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {times.map((t) => <Escudo key={t.id} nome={t.nome} url={t.escudo_url} cor={t.cor} tamanho={24} />)}
                  </div>
                </div>
                <span className="seta" aria-hidden="true">›</span>
              </div>
              <div className="mini-numeros">
                <span><b className="num">{r.jogos}</b> jogos</span>
                <span><b className="num">{r.gols}</b> gols</span>
                <span><b className="num">{r.assistencias}</b> assist.</span>
              </div>
              {proximo && <p className="proximo-mini">📅 Próximo: {dataDoJogo(proximo.data_hora)} · vs {proximo.adversario}</p>}
            </Link>
          );
        })}
      </div>

      {d.jogadores.length > 0 && (
        <Link to="/jogador/novo" className="btn btn-fantasma">+ Cadastrar outro jogador</Link>
      )}
      <Rodape />
    </main>
  );
}
