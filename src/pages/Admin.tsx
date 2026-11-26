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

/** Painel do administrador: quantas pessoas usam o app. Só o administrador vê. */
export function Admin() {
  const [p, setP] = useState<Painel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('painel_admin');
    if (error) setErro(mensagemDeErro(error));
    else setP(data as Painel);
  }, []);
  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60000);
    return () => clearInterval(t);
  }, [carregar]);

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
            <div className="numero"><b>{p.ultimos_30_dias}</b><span>30 dias</span></div>
            <div className="numero"><b>{p.contas}</b><span>Contas</span></div>
          </div>

          <section className="cartao" style={{ overflowX: 'auto' }}>
            <table className="tabela">
              <tbody>
                <tr><td>Contas novas nos últimos 7 dias</td><td className="n"><b>{p.contas_novas_7_dias}</b></td></tr>
                <tr><td>Jogadores cadastrados</td><td className="n"><b>{p.jogadores}</b></td></tr>
                <tr><td>Times</td><td className="n"><b>{p.times}</b></td></tr>
                <tr><td>Jogos lançados</td><td className="n"><b>{p.jogos}</b></td></tr>
                <tr><td>Jogos lançados nos últimos 7 dias</td><td className="n"><b>{p.jogos_7_dias}</b></td></tr>
              </tbody>
            </table>
          </section>

          <section className="cartao" style={{ overflowX: 'auto' }}>
            <h3 style={{ marginBottom: 8 }}>Últimos cadastros</h3>
            <table className="tabela">
              <thead><tr><th>Nome</th><th className="n">Jog.</th><th className="n">Entrou</th><th className="n">Último uso</th></tr></thead>
              <tbody>
                {p.cadastros_recentes.map((c, i) => (
                  <tr key={i}>
                    <td>{c.nome}</td>
                    <td className="n">{c.jogadores}</td>
                    <td className="n">{new Date(c.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
                    <td className="n">{quando(c.visto_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p className="muted small">Atualiza sozinho a cada minuto. Só a sua conta de administrador vê esta página; telefones e e-mails não aparecem aqui.</p>
        </>
      )}
    </main>
  );
}
