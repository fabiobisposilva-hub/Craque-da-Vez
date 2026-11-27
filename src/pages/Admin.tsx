import { useCallback, useEffect, useState } from 'react';
import { Erro, Topo } from '../components/Comuns';
import { mensagemDeErro, supabase } from '../lib/supabase';

interface Painel {
  online_agora: number;
  hoje: number;
  ultimos_7_dias: number;
  ultimos_30_dias: number;
  contas: number;
  contas_novas_7_dias: number;
  jogadores: number;
  times: number;
  jogos: number;
  jogos_7_dias: number;
  cadastros_recentes: { nome: string; criado_em: string; visto_em: string | null; jogadores: number }[];
}

function quando(iso: string | null) {
  if (!iso) return 'nunca';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 5) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

type Pessoa = {
  id: string; nome: string; email: string; telefone: string | null; criado_em: string; visto_em: string | null;
  aprovacao: 'pendente' | 'liberado' | 'recusado'; email_confirmado: boolean;
  cadastrou: { apelido: string; nome: string; categoria: string; times: string | null }[];
  convidado_em: { apelido: string; parentesco: string | null; papel: string; status: string }[];
};
type Atleta = { apelido: string; nome: string; categoria: string; criado_em: string; cadastrado_por: string; jogos: number; ultimo_jogo: string | null };
type Completo = { pessoas: Pessoa[]; atletas: Atleta[] };

const CHAVE_VISTO = 'craque:admin-visto';
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
const PAPEL: Record<string, string> = { responsavel: 'edita', leitor: 'só vê', titular: 'cadastrou' };

function CartaoPessoa({ p, novo, onDefinir, ocupado }: { p: Pessoa; novo: boolean; onDefinir: (id: string, s: string) => void; ocupado: boolean }) {
  return (
    <div className="cartao pilha" style={{ gap: 6, borderColor: p.aprovacao === 'pendente' ? 'var(--accent)' : undefined }}>
      <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
        <b className="cresce">{p.nome || '(sem nome)'}</b>
        {novo && <span className="selo">🆕 novo</span>}
        {p.aprovacao === 'pendente' && <span className="selo">⏳ aguardando</span>}
        {p.aprovacao === 'recusado' && <span className="selo">⛔ recusado</span>}
      </div>
      <p className="small">✉️ {p.email} {p.email_confirmado ? '✅' : <span className="muted">(e-mail não confirmado)</span>}</p>
      {p.telefone && <p className="small">📱 <a className="link" href={`https://wa.me/55${p.telefone.replace(/\D/g, '').replace(/^55/, '')}`} target="_blank" rel="noopener noreferrer">{p.telefone}</a></p>}
      <p className="muted small">Entrou em {dia(p.criado_em)} · último uso: {quando(p.visto_em)}</p>
      {p.cadastrou.length > 0 && <p className="small">⚽ Cadastrou: {p.cadastrou.map((a) => `${a.apelido} (${a.categoria}${a.times ? ` · ${a.times}` : ''})`).join('; ')}</p>}
      {p.convidado_em.length > 0 && <p className="small">👥 Convidado em: {p.convidado_em.map((a) => `${a.apelido} (${a.parentesco ?? '—'}, ${PAPEL[a.papel] ?? a.papel}${a.status !== 'ativo' ? `, ${a.status}` : ''})`).join('; ')}</p>}
      <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
        {p.aprovacao !== 'liberado' && <button className="btn btn-primario btn-pequeno" disabled={ocupado} onClick={() => onDefinir(p.id, 'liberado')}>✅ Liberar</button>}
        {p.aprovacao !== 'recusado' && <button className="btn btn-contorno btn-pequeno" disabled={ocupado} onClick={() => onDefinir(p.id, 'recusado')}>{p.aprovacao === 'liberado' ? '⛔ Bloquear conta' : '⛔ Recusar'}</button>}
      </div>
    </div>
  );
}

/** Painel do administrador: quem usa o app, contas para liberar e atletas. Só o administrador vê. */
export function Admin() {
  const [p, setP] = useState<Painel | null>(null);
  const [c, setC] = useState<Completo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<'aguardando' | 'pessoas' | 'atletas'>('aguardando');
  const [busca, setBusca] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [vistoAntes] = useState(() => { try { return localStorage.getItem(CHAVE_VISTO); } catch { return null; } });
  useEffect(() => { try { localStorage.setItem(CHAVE_VISTO, new Date().toISOString()); } catch { /* sem armazenamento */ } }, []);

  const carregar = useCallback(async () => {
    const [a, b] = await Promise.all([supabase.rpc('painel_admin'), supabase.rpc('painel_admin_completo')]);
    if (a.error || b.error) return setErro(mensagemDeErro(a.error ?? b.error));
    setP(a.data as Painel);
    setC(b.data as Completo);
  }, []);
  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60000);
    return () => clearInterval(t);
  }, [carregar]);

  async function definir(id: string, status: string) {
    if (status === 'recusado' && !confirm('Recusar/bloquear esta conta? A pessoa não consegue usar o app até você liberar.')) return;
    setOcupado(true);
    const { error } = await supabase.rpc('definir_aprovacao', { p_usuario: id, p_status: status });
    if (error) setErro(mensagemDeErro(error));
    await carregar();
    setOcupado(false);
  }

  const novo = (x: Pessoa) => !!vistoAntes && x.criado_em > vistoAntes;
  const q = busca.trim().toLowerCase();
  const pessoas = (c?.pessoas ?? []).filter((x) => !q || [x.nome, x.email, x.telefone ?? '', ...x.cadastrou.map((a) => a.apelido)].join(' ').toLowerCase().includes(q));
  const pendentes = (c?.pessoas ?? []).filter((x) => x.aprovacao === 'pendente');
  const novos = (c?.pessoas ?? []).filter(novo);
  const atletas = (c?.atletas ?? []).filter((x) => !q || [x.apelido, x.nome, x.cadastrado_por].join(' ').toLowerCase().includes(q));

  return (
    <main className="tela">
      <Topo titulo="Painel do administrador">
        <button className="btn btn-fantasma btn-pequeno" onClick={carregar}>Atualizar</button>
      </Topo>
      <Erro msg={erro} />
      {p && (
        <>
          <section className="cartao pilha" style={{ alignItems: 'center', textAlign: 'center' }}>
            <span className="selo">Usando agora</span>
            <b className="num" style={{ fontSize: 48, lineHeight: 1 }}>{p.online_agora}</b>
            <span className="muted small">pessoas com o app aberto nos últimos 5 minutos</span>
          </section>

          <div className="numeros">
            <div className="numero"><b>{p.hoje}</b><span>Hoje</span></div>
            <div className="numero"><b>{p.ultimos_7_dias}</b><span>7 dias</span></div>
            <div className="numero"><b>{p.contas}</b><span>Contas</span></div>
            <div className="numero"><b>{p.jogadores}</b><span>Atletas</span></div>
          </div>
        </>
      )}

      {novos.length > 0 && (
        <div className="aviso">🆕 <b>{novos.length} pessoa{novos.length > 1 ? 's' : ''} nova{novos.length > 1 ? 's' : ''}</b> desde a sua última visita: {novos.map((x) => x.nome).join(', ')}.</div>
      )}

      <div className="chips">
        <button className="chip" aria-pressed={aba === 'aguardando'} onClick={() => setAba('aguardando')}>⏳ Aguardando ({pendentes.length})</button>
        <button className="chip" aria-pressed={aba === 'pessoas'} onClick={() => setAba('pessoas')}>👥 Pessoas ({c?.pessoas.length ?? 0})</button>
        <button className="chip" aria-pressed={aba === 'atletas'} onClick={() => setAba('atletas')}>⚽ Atletas ({c?.atletas.length ?? 0})</button>
      </div>

      {aba !== 'aguardando' && <input placeholder="Buscar por nome, e-mail, celular ou atleta" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />}

      {aba === 'aguardando' && (pendentes.length === 0
        ? <p className="muted small">Ninguém aguardando liberação. 👍</p>
        : pendentes.map((x) => <CartaoPessoa key={x.id} p={x} novo={novo(x)} onDefinir={definir} ocupado={ocupado} />))}

      {aba === 'pessoas' && pessoas.map((x) => <CartaoPessoa key={x.id} p={x} novo={novo(x)} onDefinir={definir} ocupado={ocupado} />)}

      {aba === 'atletas' && (
        <section className="cartao" style={{ overflowX: 'auto' }}>
          <table className="tabela">
            <thead><tr><th>Atleta</th><th>Cadastrou</th><th className="n">Jogos</th><th className="n">Último</th></tr></thead>
            <tbody>
              {atletas.map((a, i) => (
                <tr key={i}>
                  <td><b>{a.apelido}</b><br /><span className="muted small">{a.nome} · {a.categoria}</span></td>
                  <td className="small">{a.cadastrado_por}<br /><span className="muted">{dia(a.criado_em)}</span></td>
                  <td className="n">{a.jogos}</td>
                  <td className="n">{a.ultimo_jogo ? dia(a.ultimo_jogo) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <p className="muted small">Atualiza sozinho a cada minuto. Só a sua conta de administrador vê esta página. Use estes dados só para suporte e segurança.</p>
    </main>
  );
}
