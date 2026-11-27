import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Erro, Topo } from '../components/Comuns';
import { escolhasVazias, TermoMenor, VIS_OPCOES, type EscolhasTermo } from '../components/TermoMenor';
import { idadeEmAnos } from '../lib/categorias';
import { podeEditar, useDados } from '../lib/dados';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { VERSAO_TERMOS, type Jogador, type Visibilidade } from '../lib/tipos';

interface Consentimento { id: string; jogador_id: string | null; tipo: string; valor: string; versao_documento: string; aceito_em: string; revogado_em: string | null }

const NOMES_TIPO: Record<string, string> = {
  maior_18: 'Tenho 18 anos ou mais', termos_uso: 'Termos de Uso', politica_privacidade: 'Política de Privacidade',
  responsavel_legal: 'Sou responsável legal', tratamento_dados_menor: 'Uso dos dados do atleta', acesso_tecnico: 'Acesso de técnicos',
  visibilidade_perfil: 'Visibilidade do perfil',
};

const reg = (jogador: string | null, tipo: string, valor: string) =>
  supabase.rpc('registrar_consentimento', { p_jogador: jogador, p_tipo: tipo, p_valor: valor, p_versao: VERSAO_TERMOS });

/** Configurações › Privacidade: direitos do titular (LGPD art. 18). */
export function PrivacidadeConfig() {
  const d = useDados();
  const [cons, setCons] = useState<Consentimento[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const carregarCons = () => supabase.from('consentimentos').select('*').order('aceito_em', { ascending: false }).then(({ data }) => setCons((data as Consentimento[]) ?? []));
  useEffect(() => { carregarCons(); }, []);

  const meus = d.jogadores.filter((j) => podeEditar(d, j.id));
  const ativo = (jid: string | null, tipo: string) => cons.find((c) => c.jogador_id === jid && c.tipo === tipo && !c.revogado_em);

  async function baixarDados() {
    setErro(null);
    const tabelas = ['usuarios', 'jogadores', 'jogador_responsaveis', 'jogador_times', 'times', 'campeonatos', 'jogos', 'jogo_participacoes', 'consentimentos', 'convites_responsavel', 'notificacoes'];
    const saida: Record<string, unknown> = { gerado_em: new Date().toISOString(), aplicativo: 'Craque da Vez' };
    for (const t of tabelas) {
      const { data } = await supabase.from(t).select('*');
      saida[t] = data ?? [];
    }
    const blob = new Blob([JSON.stringify(saida, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `craque-da-vez-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setAviso('Arquivo com os seus dados baixado.');
  }

  return (
    <main className="tela">
      <Topo titulo="Privacidade" />
      <p className="muted small">Aqui você controla quem vê os dados dos atletas, retira autorizações, baixa uma cópia dos seus dados e exclui atletas ou a conta. <Link to="/privacidade">Ler a Política de Privacidade</Link></p>
      <Erro msg={erro} />
      {aviso && <p className="aviso">{aviso}</p>}

      {meus.map((j) => (
        <AtletaPrivacidade key={j.id} j={j} d={d} cons={cons} ativo={ativo}
          onMudou={async () => { await d.recarregar(); carregarCons(); }} setErro={setErro} />
      ))}

      <section className="cartao pilha">
        <h3>📥 Baixar meus dados</h3>
        <p className="muted small">Um arquivo (JSON) com o seu cadastro, os atletas, times, jogos e consentimentos que você pode ver.</p>
        <button className="btn btn-fantasma" onClick={baixarDados}>Baixar meus dados</button>
      </section>

      <section className="cartao pilha">
        <h3>📜 Seus consentimentos</h3>
        {cons.length === 0 && <p className="muted small">Nenhum registro ainda.</p>}
        <ul className="lista-stats">
          {cons.slice(0, 30).map((c) => (
            <li key={c.id}>
              <span>
                {NOMES_TIPO[c.tipo] ?? c.tipo}{c.jogador_id && ` · ${d.jogadores.find((x) => x.id === c.jogador_id)?.apelido ?? 'atleta'}`}
                <small className="muted" style={{ display: 'block' }}>{new Date(c.aceito_em).toLocaleString('pt-BR')} · versão {c.versao_documento}{c.revogado_em && ` · substituído em ${new Date(c.revogado_em).toLocaleDateString('pt-BR')}`}</small>
              </span>
              <b>{c.valor}</b>
            </li>
          ))}
        </ul>
      </section>

      <ExcluirConta d={d} setErro={setErro} />
    </main>
  );
}

function AtletaPrivacidade({ j, d, cons, ativo, onMudou, setErro }: {
  j: Jogador; d: ReturnType<typeof useDados>; cons: Consentimento[];
  ativo: (jid: string | null, tipo: string) => Consentimento | undefined;
  onMudou: () => void; setErro: (e: string | null) => void;
}) {
  const [apelido, setApelido] = useState(j.apelido);
  const [vis, setVis] = useState<Visibilidade>(j.visibilidade);
  const [termo, setTermo] = useState<EscolhasTermo>({ ...escolhasVazias(), visibilidade: j.visibilidade });
  const [excluindo, setExcluindo] = useState(false);
  const [confirma, setConfirma] = useState('');
  const menor = idadeEmAnos(j.data_nascimento) < 18;
  const titular = d.papeis[j.id] === 'titular';
  const semAutorizacao = menor && !ativo(j.id, 'tratamento_dados_menor');
  const tecnicoOk = ativo(j.id, 'acesso_tecnico')?.valor === 'aceito';
  const timesTecnico = d.vinculos.filter((v) => v.jogador_id === j.id && v.status === 'ativo')
    .map((v) => d.times.find((t) => t.id === v.time_id)).filter((t): t is NonNullable<typeof t> => !!t && t.tipo === 'tecnico');
  void cons;

  async function salvar() {
    setErro(null);
    if (!apelido.trim()) return setErro('O apelido é obrigatório.');
    const { error } = await supabase.from('jogadores').update({ apelido: apelido.trim(), visibilidade: vis }).eq('id', j.id);
    if (error) return setErro(mensagemDeErro(error));
    if (vis !== j.visibilidade) await reg(j.id, 'visibilidade_perfil', vis);
    onMudou();
  }
  async function autorizar() {
    setErro(null);
    if (!termo.responsavel || !termo.tratamento) return setErro('Marque as duas autorizações obrigatórias.');
    await reg(j.id, 'responsavel_legal', 'aceito');
    await reg(j.id, 'tratamento_dados_menor', 'aceito');
    await reg(j.id, 'acesso_tecnico', termo.tecnico ? 'aceito' : 'recusado');
    await reg(j.id, 'visibilidade_perfil', termo.visibilidade);
    await supabase.from('jogadores').update({ visibilidade: termo.visibilidade }).eq('id', j.id);
    onMudou();
  }
  async function acessoTecnico(permitir: boolean) {
    await reg(j.id, 'acesso_tecnico', permitir ? 'aceito' : 'revogado');
    if (!permitir) for (const t of timesTecnico) await supabase.from('jogador_times').delete().match({ jogador_id: j.id, time_id: t.id });
    onMudou();
  }
  async function tirarDoTime(timeId: string) {
    await supabase.from('jogador_times').delete().match({ jogador_id: j.id, time_id: timeId });
    await reg(j.id, 'acesso_tecnico', 'revogado');
    onMudou();
  }
  async function excluir() {
    setErro(null);
    // apaga as fotos do atleta antes (pasta privada)
    const { data: arqs } = await supabase.storage.from('fotos').list(j.id, { limit: 1000 });
    if (arqs?.length) await supabase.storage.from('fotos').remove(arqs.map((a) => `${j.id}/${a.name}`));
    const { error } = await supabase.rpc('excluir_jogador', { p_jogador: j.id });
    if (error) return setErro(mensagemDeErro(error));
    onMudou();
  }

  return (
    <section id={`atleta-${j.id}`} className="cartao pilha">
      <h2>{j.apelido}</h2>
      {semAutorizacao && (
        <>
          <p className="aviso"><b style={{ color: 'var(--text)' }}>Falta a sua autorização</b> para o uso dos dados de {j.apelido}, que é menor de idade.</p>
          <TermoMenor nome={j.apelido} valor={termo} onChange={setTermo} />
          <button className="btn btn-primario" onClick={autorizar}>Autorizar</button>
        </>
      )}

      <label className="campo">
        Apelido (é o que os outros veem)
        <input id={`ap-${j.id}`} maxLength={30} value={apelido} onChange={(e) => setApelido(e.target.value)} />
      </label>
      <span className="selo">Quem vê o apelido, o time e as estatísticas</span>
      {VIS_OPCOES.map(([k, v]) => (
        <label key={k} className="aceite">
          <input type="radio" name={`vis-${j.id}`} checked={vis === k} onChange={() => setVis(k)} />
          <span>{v}</span>
        </label>
      ))}
      <button className="btn btn-fantasma" onClick={salvar} disabled={apelido === j.apelido && vis === j.visibilidade}>Salvar</button>

      {menor && (
        <>
          <span className="selo">Técnicos</span>
          <label className="aceite">
            <input type="checkbox" checked={tecnicoOk} onChange={(e) => acessoTecnico(e.target.checked)} />
            <span>Autorizo que técnicos dos times de {j.apelido} vejam o nome e lancem as estatísticas dele nos jogos do time. Técnicos nunca veem fotos nem a data de nascimento.</span>
          </label>
          {timesTecnico.map((t) => (
            <div key={t.id} className="linha small">
              <span className="cresce">Técnico do <b>{t.nome}</b> tem acesso</span>
              <button className="chip" onClick={() => tirarDoTime(t.id)}>Retirar acesso</button>
            </div>
          ))}
        </>
      )}

      {titular && (excluindo ? (
        <div className="pilha" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <p className="small"><b>Excluir {j.apelido}?</b> Apaga o atleta, as fotos, as estatísticas dele e o acesso da família. Os jogos dos times continuam, sem o nome dele. Não dá para desfazer.</p>
          <label className="campo">Para confirmar, digite o apelido: {j.apelido}
            <input id={`conf-${j.id}`} value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="off" />
          </label>
          <div className="grade-2">
            <button className="btn btn-primario" disabled={confirma.trim() !== j.apelido.trim()} onClick={excluir}>Excluir atleta</button>
            <button className="btn btn-fantasma" onClick={() => { setExcluindo(false); setConfirma(''); }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button className="link" style={{ alignSelf: 'flex-start', color: 'var(--derrota)' }} onClick={() => setExcluindo(true)}>🗑️ Excluir este atleta</button>
      ))}
    </section>
  );
}

function ExcluirConta({ d, setErro }: { d: ReturnType<typeof useDados>; setErro: (e: string | null) => void }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    setExcluindo(true); setErro(null);
    try {
      // fotos dos atletas que eu cadastrei e meus papéis de parede
      for (const j of d.jogadores.filter((x) => d.papeis[x.id] === 'titular')) {
        const { data } = await supabase.storage.from('fotos').list(j.id, { limit: 1000 });
        if (data?.length) await supabase.storage.from('fotos').remove(data.map((a) => `${j.id}/${a.name}`));
      }
      if (d.meuId) {
        const { data } = await supabase.storage.from('papeis').list(d.meuId, { limit: 1000 });
        if (data?.length) await supabase.storage.from('papeis').remove(data.map((a) => `${d.meuId}/${a.name}`));
      }
      const { error } = await supabase.rpc('excluir_minha_conta');
      if (error) throw error;
      await supabase.auth.signOut();
    } catch (e) {
      setErro(mensagemDeErro(e)); setExcluindo(false);
    }
  }

  return (
    <section className="cartao pilha" style={{ borderColor: 'var(--accent)' }}>
      <h3>⚠️ Excluir minha conta</h3>
      {!aberto ? (
        <button className="btn btn-contorno" onClick={() => setAberto(true)}>Excluir minha conta</button>
      ) : (
        <>
          <p className="small">Apaga a sua conta, os atletas que você cadastrou (com fotos e estatísticas), os times que você criou e os jogos que você lançou. Atletas de outras famílias não são afetados. <b>Não dá para desfazer.</b></p>
          <label className="campo">Para confirmar, digite EXCLUIR
            <input id="conf-conta" value={texto} onChange={(e) => setTexto(e.target.value)} autoCapitalize="characters" autoComplete="off" />
          </label>
          <div className="grade-2">
            <button className="btn btn-primario" disabled={texto.trim().toUpperCase() !== 'EXCLUIR' || excluindo} onClick={excluir}>{excluindo ? 'Excluindo…' : 'Excluir tudo'}</button>
            <button className="btn btn-fantasma" onClick={() => { setAberto(false); setTexto(''); }}>Cancelar</button>
          </div>
        </>
      )}
    </section>
  );
}
