import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar, Erro, Escudo, EscolherImagem, Resultado, TipoJogo, Topo } from '../components/Comuns';
import { salvarEscudoAdversario, salvarEscudoTime } from '../lib/escudos';
import { VerEscalacao } from '../components/Escalacao';
import { ehFuturo, SeloAgendado } from '../components/Confronto';
import { escudoDoAdversario, useDados } from '../lib/dados';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { chamarDe, FASES } from '../lib/tipos';

export function JogoDetalhe() {
  const { id } = useParams();
  const nav = useNavigate();
  const d = useDados();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [enviando, setEnviando] = useState<'' | 'time' | 'adv'>('');

  async function trocarEscudo(qual: 'time' | 'adv', arq: File, timeId: string, adversario: string) {
    setEnviando(qual);
    setErro(null);
    try {
      if (qual === 'time') await salvarEscudoTime(timeId, arq);
      else await salvarEscudoAdversario(d.adversarios, d.meuId, adversario, arq);
      await d.recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando('');
    }
  }

  if (d.carregando) return <main className="tela" aria-busy="true" />;
  const jogo = d.jogos.find((g) => g.id === id);
  if (!jogo)
    return (
      <main className="tela">
        <Topo titulo="Jogo" />
        <p className="muted">Jogo não encontrado. Ele pode ter sido excluído.</p>
      </main>
    );

  const time = d.times.find((t) => t.id === jogo.time_id);
  const camp = d.campeonatos.find((c) => c.id === jogo.campeonato_id);
  const parts = d.participacoes.filter((p) => p.jogo_id === jogo.id);
  const podeAlterar = jogo.lancado_por === d.meuId || time?.dono_id === d.meuId;
  const data = new Date(jogo.data_hora);
  const fase = FASES.find(([k]) => k === jogo.fase)?.[1];

  async function excluir() {
    setExcluindo(true);
    setErro(null);
    const { error, count } = await supabase.from('jogos').delete({ count: 'exact' }).eq('id', jogo!.id);
    setExcluindo(false);
    if (error) return setErro(mensagemDeErro(error));
    if (!count) return setErro('Este jogo não pode ser excluído por você. Só quem lançou o jogo (ou o técnico do time) pode excluir.');
    nav('/jogos', { replace: true });
  }

  return (
    <main className="tela">
      <Topo titulo="Jogo" />

      {ehFuturo(jogo) && <SeloAgendado data={jogo.data_hora} />}
      <section className="cartao pilha">
        <div className="placar">
          <div className="pilha" style={{ alignItems: 'center', gap: 6 }}>
            <Escudo nome={time?.nome ?? '?'} url={time?.escudo_url} cor={time?.cor} tamanho={56} />
            <p className="small" style={{ fontWeight: 700 }}>{time?.nome}</p>
            {time && time.dono_id === d.meuId && (
              <EscolherImagem id="esc-time" className="link small" desativado={!!enviando} onArquivo={(f) => trocarEscudo('time', f, time.id, jogo.adversario)}>
                {enviando === 'time' ? 'Enviando…' : time.escudo_url ? 'Trocar escudo' : '+ Escudo'}
              </EscolherImagem>
            )}
          </div>
          <div className="pilha" style={{ alignItems: 'center', gap: 4 }}>
            {ehFuturo(jogo) ? (
              <b className="confronto-vs" style={{ fontSize: 26 }}>vs</b>
            ) : (
              <>
                <div className="gols num" style={{ fontSize: 36 }}>{jogo.gols_pro} × {jogo.gols_contra}</div>
                <Resultado r={jogo.resultado} />
              </>
            )}
          </div>
          <div className="pilha" style={{ alignItems: 'center', gap: 6 }}>
            <Escudo nome={jogo.adversario} url={escudoDoAdversario(d, jogo.adversario)} tamanho={56} />
            <p className="small" style={{ fontWeight: 700 }}>{jogo.adversario}</p>
            <EscolherImagem id="esc-adv" className="link small" desativado={!!enviando} onArquivo={(f) => trocarEscudo('adv', f, jogo.time_id, jogo.adversario)}>
              {enviando === 'adv' ? 'Enviando…' : escudoDoAdversario(d, jogo.adversario) ? 'Trocar escudo' : '+ Escudo'}
            </EscolherImagem>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}><TipoJogo jogo={jogo} campeonato={camp} /></div>
        <p className="muted small" style={{ textAlign: 'center' }}>
          {data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} ·{' '}
          {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          <br />
          {jogo.categoria} · {camp ? `${camp.nome} ${camp.temporada}${fase ? ` · ${fase}` : ''}` : jogo.tipo === 'treino' ? 'Treino' : 'Amistoso'}
          {jogo.casa_fora && ` · ${jogo.casa_fora === 'casa' ? 'em casa' : 'fora'}`}
        </p>
      </section>

      {jogo.local && (
        <section className="cartao linha">
          <span aria-hidden="true" style={{ fontSize: 22 }}>📍</span>
          <div className="cresce" style={{ minWidth: 0 }}>
            <p className="selo">Local da partida</p>
            <b>{jogo.local}</b>
          </div>
          <a className="btn btn-fantasma btn-pequeno" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(jogo.local)}`} target="_blank" rel="noopener noreferrer">Ver no mapa</a>
        </section>
      )}

      <VerEscalacao escalacao={jogo.escalacao ?? []} />

      {jogo.resumo && (
        <section className="cartao pilha">
          <h3>Resumo do jogo</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{jogo.resumo}</p>
        </section>
      )}

      {parts.length > 0 && (
        <section className="cartao">
          <h3 style={{ marginBottom: 8 }}>Jogadores</h3>
          {parts.map((p) => {
            const j = d.jogadores.find((x) => x.id === p.jogador_id);
            if (!j) return null;
            return (
              <div key={p.jogador_id} className="lista-jogo">
                <Avatar jogador={j} />
                <div className="cresce" style={{ minWidth: 0 }}>
                  <b>{chamarDe(j)}</b> {p.craque_do_jogo && <span className="estrela">★ craque do jogo</span>}
                  <p className="muted small">
                    {p.gols} gol{p.gols === 1 ? '' : 's'} · {p.assistencias} assist. · {p.titular ? 'titular' : 'reserva'}
                    {p.amarelos > 0 && <> · <i className="cartao-ico am" /> {p.amarelos}</>}
                    {p.vermelho && <> · <i className="cartao-ico vm" /> vermelho{p.suspenso_proximo ? ' (suspenso no próximo)' : ''}</>}
                  </p>
                  {p.observacao && <p className="small" style={{ marginTop: 4 }}>“{p.observacao}”</p>}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {podeAlterar && (
        <div className="pilha">
          <Link to={`/jogo/${jogo.id}/editar`} className="btn btn-primario">✏️ Editar jogo</Link>
          {confirmando ? (
            <div className="cartao pilha" style={{ borderColor: 'var(--accent)' }}>
              <p><b>Excluir este jogo?</b> Os gols, assistências e cartões dele saem das estatísticas. Não dá para desfazer.</p>
              <div className="grade-2">
                <button className="btn btn-primario" onClick={excluir} disabled={excluindo}>{excluindo ? 'Excluindo…' : 'Sim, excluir'}</button>
                <button className="btn btn-fantasma" onClick={() => setConfirmando(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-contorno" onClick={() => setConfirmando(true)}>🗑️ Excluir jogo</button>
          )}
        </div>
      )}
      <Erro msg={erro} />
    </main>
  );
}
