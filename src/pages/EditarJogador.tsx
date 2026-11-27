import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Erro, EscolherImagem, Topo } from '../components/Comuns';
import { enviarFotoJogador, linksDasFotos } from '../lib/imagens';
import { categoriaNatural, categoriasElegiveis, idadeEmAnos } from '../lib/categorias';
import { mensagemDeErro, supabase } from '../lib/supabase';
import { iniciais, VERSAO_TERMOS, type Jogador, type Visibilidade } from '../lib/tipos';
import { escolhasVazias, TermoMenor, VIS_OPCOES, type EscolhasTermo } from '../components/TermoMenor';


export function EditarJogador() {
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState({ nome: '', apelido: '', data_nascimento: '', perna_dominante: '' as string, visibilidade: 'aprovados' as Visibilidade });
  const [termo, setTermo] = useState<EscolhasTermo>(escolhasVazias());
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [imgs, setImgs] = useState<{ foto: string | null; capa: string | null }>({ foto: null, capa: null });
  const [enviando, setEnviando] = useState('');

  async function mostrarImagens(foto: string | null, capa: string | null) {
    const links = await linksDasFotos([foto ?? '', capa ?? '']);
    setImgs({ foto: foto ? links[foto] ?? null : null, capa: capa ? links[capa] ?? null : null });
  }

  async function trocar(tipo: 'foto' | 'capa', arq: File) {
    if (!id) return;
    setEnviando(tipo);
    setErro(null);
    try {
      const caminho = await enviarFotoJogador(id, arq, tipo);
      const { data, error } = await supabase.from('jogadores').update(tipo === 'foto' ? { foto_url: caminho } : { capa_url: caminho }).eq('id', id).select('foto_url, capa_url').single();
      if (error) throw error;
      await mostrarImagens(data.foto_url, data.capa_url);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando('');
    }
  }

  useEffect(() => {
    if (!id) return;
    supabase.from('jogadores').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        const j = data as Jogador;
        mostrarImagens(j.foto_url, j.capa_url);
        setF({ nome: j.nome, apelido: j.apelido ?? '', data_nascimento: j.data_nascimento, perna_dominante: j.perna_dominante ?? '', visibilidade: j.visibilidade });
      }
    });
  }, [id]);

  const menor = f.data_nascimento ? idadeEmAnos(f.data_nascimento) < 18 : true;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!f.apelido.trim()) return setErro('O apelido é obrigatório: é como o atleta aparece para quem não é da família.');
    const novoMenor = !id && menor;
    if (novoMenor && (!termo.responsavel || !termo.tratamento)) return setErro('Marque as duas autorizações obrigatórias para cadastrar o atleta.');
    setSalvando(true);
    const linha = {
      nome: f.nome.trim(), apelido: f.apelido.trim(), data_nascimento: f.data_nascimento, perna_dominante: f.perna_dominante || null,
      visibilidade: novoMenor ? termo.visibilidade : f.visibilidade,
    };
    const r = id
      ? await supabase.from('jogadores').update(linha).eq('id', id).select('id').single()
      : await supabase.from('jogadores').insert(linha).select('id').single();
    if (r.error) { setSalvando(false); return setErro(mensagemDeErro(r.error)); }
    const jid = r.data.id as string;
    // Prova do consentimento (LGPD art. 14)
    const reg = (tipo: string, valor: string) => supabase.rpc('registrar_consentimento', { p_jogador: jid, p_tipo: tipo, p_valor: valor, p_versao: VERSAO_TERMOS });
    if (novoMenor) {
      await reg('responsavel_legal', 'aceito');
      await reg('tratamento_dados_menor', 'aceito');
      await reg('acesso_tecnico', termo.tecnico ? 'aceito' : 'recusado');
      await reg('visibilidade_perfil', termo.visibilidade);
    } else if (id) {
      await reg('visibilidade_perfil', f.visibilidade);
    }
    setSalvando(false);
    nav(`/jogador/${jid}`, { replace: true });
  }


  const elegiveis = f.data_nascimento ? categoriasElegiveis(f.data_nascimento) : [];

  return (
    <main className="tela sem-menu">
      <Topo titulo={id ? 'Editar jogador' : 'Novo jogador'} />
      {id ? (
        <section className="cartao pilha">
          <h3>Fotos</h3>
          <div className="linha">
            <div className="avatar grande">{imgs.foto ? <img src={imgs.foto} alt="" /> : iniciais(f.nome || '?')}</div>
            <div className="pilha cresce">
              <EscolherImagem id="ed-foto" desativado={!!enviando} onArquivo={(a) => trocar('foto', a)}>{enviando === 'foto' ? 'Enviando…' : '📷 Foto do jogador'}</EscolherImagem>
              <EscolherImagem id="ed-capa" desativado={!!enviando} onArquivo={(a) => trocar('capa', a)}>{enviando === 'capa' ? 'Enviando…' : '🖼️ Papel de parede do app'}</EscolherImagem>
            </div>
          </div>
          {imgs.capa && <div style={{ height: 120, borderRadius: 12, backgroundImage: `url(${imgs.capa})`, backgroundSize: 'cover', backgroundPosition: 'center' }} aria-label="Capa atual" />}
          <p className="muted small">A foto aparece redonda no lugar das iniciais e <b>só a família vê</b>.</p>
        </section>
      ) : (
        <p className="aviso">Depois de cadastrar, você pode colocar a foto do jogador e o fundo do perfil.</p>
      )}
      <form className="pilha" onSubmit={salvar}>
        <label className="campo">
          Nome do atleta
          <input id="jog-nome" required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        </label>
        <label className="campo">
          Apelido (obrigatório)
          <input id="jog-apelido" required maxLength={30} placeholder='Ex.: "Miguelzinho" ou "Camisa 10"' value={f.apelido} onChange={(e) => setF({ ...f, apelido: e.target.value })} />
          <span className="muted small" style={{ fontWeight: 500 }}>É como o atleta aparece para quem não é da família. Evite o nome completo.</span>
        </label>
        <label className="campo">
          Data de nascimento
          <input id="jog-nasc" type="date" required max={new Date().toISOString().slice(0, 10)} value={f.data_nascimento}
            onChange={(e) => {
              const nasc = e.target.value;
              const ficouMenor = nasc && idadeEmAnos(nasc) < 18;
              setF({ ...f, data_nascimento: nasc, visibilidade: ficouMenor && f.visibilidade === 'publico' ? 'aprovados' : f.visibilidade });
              if (ficouMenor) setTermo((t) => ({ ...t, visibilidade: 'aprovados' }));
            }} />
        </label>
        {f.data_nascimento && (
          <div className="cartao small">
            Categoria nesta temporada: <b>{categoriaNatural(f.data_nascimento)}</b>
            <p className="muted" style={{ marginTop: 4 }}>
              Pode jogar em: {elegiveis.length > 6 ? `${elegiveis[0]} a ${elegiveis[elegiveis.length - 2]} e ${elegiveis[elegiveis.length - 1]}` : elegiveis.join(', ')}. Muda sozinha em janeiro.
            </p>
          </div>
        )}
        <fieldset className="pilha" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="selo" style={{ marginBottom: 8 }}>Perna dominante</legend>
          <div className="chips">
            {(['direita', 'esquerda', 'ambidestro'] as const).map((p) => (
              <button type="button" key={p} className="chip" aria-pressed={f.perna_dominante === p} onClick={() => setF({ ...f, perna_dominante: p })}>
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>
        {!id && menor && f.data_nascimento ? (
          <TermoMenor nome={f.apelido || f.nome} valor={termo} onChange={setTermo} />
        ) : (
          <fieldset className="pilha" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="selo" style={{ marginBottom: 8 }}>Quem vê o apelido, o time e as estatísticas</legend>
            {VIS_OPCOES.map(([k, v]) => (
              <label key={k} className="aceite">
                <input type="radio" name="jog-vis" checked={f.visibilidade === k} onChange={() => setF({ ...f, visibilidade: k })} />
                <span>{v}</span>
              </label>
            ))}
            <p className="muted small">Fotos, nome completo e data de nascimento nunca aparecem para quem não é da família.</p>
          </fieldset>
        )}
        <Erro msg={erro} />
        <button className="btn btn-primario" disabled={salvando}>
          {salvando ? 'Salvando…' : id ? 'Salvar' : menor && f.data_nascimento ? 'Autorizar e cadastrar' : 'Cadastrar jogador'}
        </button>
      </form>
    </main>
  );
}
