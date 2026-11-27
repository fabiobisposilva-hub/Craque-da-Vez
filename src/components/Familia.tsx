import { useCallback, useEffect, useState } from 'react';
import { Erro } from './Comuns';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { iniciais, nomeParentesco, PARENTESCOS } from '../lib/tipos';

interface Membro { usuario_id: string; nome: string; parentesco: string | null; papel: string; status: string; visto_em: string | null; desde: string; sou_eu: boolean }
interface Convite { codigo: string; papel: 'responsavel' | 'leitor'; criado_em: string }

function ultimoUso(iso: string | null) {
  if (!iso) return 'ainda não usou';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 5) return 'usando agora';
  if (min < 60) return `usou há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `usou há ${h} h`;
  const dias = Math.round(h / 24);
  return dias < 30 ? `usou há ${dias} dia${dias > 1 ? 's' : ''}` : `usou em ${new Date(iso).toLocaleDateString('pt-BR')}`;
}

/** Família do atleta: quem acompanha, parentesco, convites e bloquear/liberar (o titular decide). */
export function Familia({ jogadorId, nome }: { jogadorId: string; nome: string }) {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [convite, setConvite] = useState<Convite | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [m, c] = await Promise.all([
      supabase.rpc('familia_do_jogador', { p_jogador: jogadorId }),
      supabase.from('convites_responsavel').select('codigo, papel, criado_em').eq('jogador_id', jogadorId).is('usado_por', null).eq('cancelado', false).order('criado_em', { ascending: false }),
    ]);
    if (m.error) setErro(mensagemDeErro(m.error));
    else setMembros(m.data as Membro[]);
    setConvites((c.data as Convite[]) ?? []);
  }, [jogadorId]);
  useEffect(() => { carregar(); }, [carregar]);

  const eu = membros.find((m) => m.sou_eu);
  const souTitular = eu?.papel === 'titular';
  const ativos = membros.filter((m) => m.status === 'ativo');
  const editores = ativos.filter((m) => m.papel !== 'leitor').length;
  const ocupados = new Set(ativos.filter((m) => !m.sou_eu).map((m) => m.parentesco));

  async function meuParentesco(p: string) {
    setErro(null);
    const { error } = await supabase.rpc('definir_parentesco', { p_jogador: jogadorId, p_parentesco: p });
    if (error) setErro(mensagemDeErro(error)); else carregar();
  }
  async function acao(usuario: string, a: string) {
    setErro(null);
    const { error } = await supabase.rpc('alterar_acesso', { p_jogador: jogadorId, p_usuario: usuario, p_acao: a });
    if (error) setErro(mensagemDeErro(error));
    setRemovendo(null);
    carregar();
  }
  async function convidar(papel: Convite['papel']) {
    setErro(null); setAviso(null);
    const { data, error } = await supabase.from('convites_responsavel').insert({ jogador_id: jogadorId, papel }).select('codigo, papel, criado_em').single();
    if (error) return setErro(mensagemDeErro(error));
    setConvite(data as Convite);
    carregar();
  }
  async function cancelar(codigo: string) {
    await supabase.from('convites_responsavel').update({ cancelado: true }).eq('codigo', codigo);
    if (convite?.codigo === codigo) setConvite(null);
    carregar();
  }
  const mensagem = (c: Convite) =>
    `Oi! Te convidei para ${c.papel === 'leitor' ? `acompanhar o ${nome}` : `cuidar junto comigo do ${nome}`} no Craque da Vez ⚽\n\n` +
    `1. Abra ${location.origin}/instalar e instale o app\n2. Toque em "Criar conta" (só maiores de 18)\n3. Em Perfil → Código de convite, digite: ${c.codigo}\n4. Escolha o que você é do ${nome} (tio, avó, mãe…)`;
  async function compartilhar(c: Convite) {
    try {
      if (navigator.share) { await navigator.share({ title: 'Craque da Vez', text: mensagem(c) }); return; }
      await navigator.clipboard.writeText(mensagem(c));
      setAviso('Mensagem copiada. Cole no WhatsApp para enviar.');
    } catch { setAviso('Copie a mensagem abaixo e envie pelo WhatsApp.'); }
  }

  return (
    <section className="cartao pilha">
      <div className="secao-titulo">
        <h3>👨‍👩‍👦 Família de {nome}</h3>
        <span className="muted small num">{ativos.length} com acesso</span>
      </div>

      {eu && (
        <label className="linha small" style={{ gap: 8 }}>
          <span className="cresce"><b>Você é</b> {eu.parentesco ? '' : <span style={{ color: 'var(--accent-text)' }}>(informe)</span>}</span>
          <select id="meu-parentesco" style={{ width: 'auto' }} value={eu.parentesco ?? ''} onChange={(e) => meuParentesco(e.target.value)}>
            <option value="" disabled>Escolha</option>
            {PARENTESCOS.map(([k, v]) => <option key={k} value={k} disabled={(k === 'pai' || k === 'mae') && ocupados.has(k)}>{v}</option>)}
          </select>
        </label>
      )}

      <div className="pilha" style={{ gap: 8 }}>
        {membros.map((m) => (
          <div key={m.usuario_id} className={'membro' + (m.status === 'bloqueado' ? ' bloqueado' : '')}>
            <div className="avatar" style={{ width: 40, height: 40, fontSize: 14, borderWidth: 2 }}>{iniciais(m.nome)}</div>
            <div className="cresce" style={{ minWidth: 0 }}>
              <b>{m.nome}{m.sou_eu && ' (você)'}</b>
              <p className="muted small">
                {nomeParentesco(m.parentesco)} · {m.papel === 'titular' ? '⭐ cadastrou' : m.papel === 'leitor' ? '👀 só vê' : '✏️ edita'} ·{' '}
                {m.status === 'bloqueado' ? <span style={{ color: 'var(--derrota)', fontWeight: 700 }}>🚫 bloqueado</span> : ultimoUso(m.visto_em)}
              </p>
              {souTitular && !m.sou_eu && (
                removendo === m.usuario_id ? (
                  <div className="chips" style={{ marginTop: 6 }}>
                    <span className="small">Remover {m.nome}?</span>
                    <button className="chip" onClick={() => acao(m.usuario_id, 'remover')}>Sim, remover</button>
                    <button className="chip" onClick={() => setRemovendo(null)}>Cancelar</button>
                  </div>
                ) : (
                  <div className="chips" style={{ marginTop: 6 }}>
                    {m.status === 'bloqueado'
                      ? <button className="chip" onClick={() => acao(m.usuario_id, 'liberar')}>✅ Liberar</button>
                      : <button className="chip" onClick={() => acao(m.usuario_id, 'bloquear')}>🚫 Bloquear</button>}
                    {m.papel === 'leitor'
                      ? <button className="chip" disabled={editores >= 4} onClick={() => acao(m.usuario_id, 'pode_editar')}>✏️ Deixar editar</button>
                      : <button className="chip" onClick={() => acao(m.usuario_id, 'so_ver')}>👀 Só ver</button>}
                    <button className="chip" onClick={() => setRemovendo(m.usuario_id)}>🗑️ Remover</button>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {convites.length > 0 && (
        <div className="pilha" style={{ gap: 6 }}>
          <span className="selo">Convites aguardando</span>
          {convites.map((c) => (
            <div key={c.codigo} className="linha small" style={{ gap: 8 }}>
              <b className="num cresce" style={{ letterSpacing: '0.1em' }}>{c.codigo}</b>
              <span className="muted">{c.papel === 'leitor' ? '👀 só ver' : '✏️ editar'}</span>
              <button className="chip" onClick={() => compartilhar(c)}>Enviar</button>
              <button className="chip" onClick={() => cancelar(c.codigo)}>Cancelar</button>
            </div>
          ))}
          <p className="muted small">O código vale até alguém usar ou até você cancelar.</p>
        </div>
      )}

      {convite ? (
        <div className="pilha">
          <p className="selo">{convite.papel === 'leitor' ? 'Convite só para ver' : 'Convite de responsável'}</p>
          <b className="num" style={{ fontSize: 26, letterSpacing: '0.12em' }}>{convite.codigo}</b>
          <button className="btn btn-primario" onClick={() => compartilhar(convite)}>Enviar convite pelo WhatsApp</button>
          <textarea id="msg-convite" readOnly value={mensagem(convite)} rows={6} onFocus={(e) => e.currentTarget.select()} aria-label="Mensagem do convite" />
          {aviso && <p className="muted small">{aviso}</p>}
          <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setConvite(null)}>Fazer outro convite</button>
        </div>
      ) : (
        <div className="grade-2">
          <button className="btn btn-fantasma" onClick={() => convidar('leitor')}>👀 Convidar só para ver</button>
          <button className="btn btn-fantasma" onClick={() => convidar('responsavel')} disabled={editores >= 4}>✏️ Convidar responsável</button>
        </div>
      )}
      <p className="muted small">
        <b>Só para ver:</b> avós, tios, padrinhos acompanham tudo e não alteram nada. <b>Responsável:</b> lança jogos e edita (até 4, você incluído: {editores} de 4).
        {souTitular ? ' Você pode bloquear e liberar cada pessoa quando quiser.' : ''}
      </p>
      <Erro msg={erro} />
    </section>
  );
}
