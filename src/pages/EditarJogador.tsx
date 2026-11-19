import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Erro, Topo } from '../components/Comuns';
import { categoriaNatural, categoriasElegiveis, idadeEmAnos } from '../lib/categorias';
import { mensagemDeErro, supabase } from '../lib/supabase';
import type { Jogador, Visibilidade } from '../lib/tipos';

const VIS: [Visibilidade, string, string][] = [
  ['aprovados', 'Só aprovados', 'Só quem você aprovar vê o perfil'],
  ['publico', 'Público', 'Qualquer usuário vê nome, categoria e estatísticas'],
  ['privado', 'Privado', 'Só os responsáveis veem'],
];

export function EditarJogador() {
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState({ nome: '', data_nascimento: '', perna_dominante: '' as string, visibilidade: 'aprovados' as Visibilidade, foto_publica: false });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from('jogadores').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        const j = data as Jogador;
        setF({ nome: j.nome, data_nascimento: j.data_nascimento, perna_dominante: j.perna_dominante ?? '', visibilidade: j.visibilidade, foto_publica: j.foto_publica });
      }
    });
  }, [id]);

  const menor = f.data_nascimento ? idadeEmAnos(f.data_nascimento) < 18 : true;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const linha = { ...f, nome: f.nome.trim(), perna_dominante: f.perna_dominante || null };
    const r = id
      ? await supabase.from('jogadores').update(linha).eq('id', id).select('id').single()
      : await supabase.from('jogadores').insert(linha).select('id').single();
    setSalvando(false);
    if (r.error) return setErro(mensagemDeErro(r.error));
    nav(`/jogador/${r.data.id}`, { replace: true });
  }

  const elegiveis = f.data_nascimento ? categoriasElegiveis(f.data_nascimento) : [];

  return (
    <main className="tela sem-menu">
      <Topo titulo={id ? 'Editar jogador' : 'Novo jogador'} />
      <form className="pilha" onSubmit={salvar}>
        <label className="campo">
          Nome do atleta
          <input id="jog-nome" required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        </label>
        <label className="campo">
          Data de nascimento
          <input id="jog-nasc" type="date" required max={new Date().toISOString().slice(0, 10)} value={f.data_nascimento}
            onChange={(e) => {
              const nasc = e.target.value;
              const ficouMenor = nasc && idadeEmAnos(nasc) < 18;
              setF({ ...f, data_nascimento: nasc, visibilidade: ficouMenor && f.visibilidade === 'publico' ? 'aprovados' : f.visibilidade });
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
        <fieldset className="pilha" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="selo" style={{ marginBottom: 8 }}>Quem vê o perfil</legend>
          {VIS.map(([v, nome, desc]) => (
            <button type="button" key={v} className="cartao" style={{ textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit', borderColor: f.visibilidade === v ? 'var(--accent)' : undefined }}
              aria-pressed={f.visibilidade === v} onClick={() => setF({ ...f, visibilidade: v })}>
              <b>{nome}</b>
              <p className="muted small">{desc}</p>
            </button>
          ))}
          {menor && f.visibilidade === 'publico' && (
            <p className="aviso">Atleta menor de idade com perfil público: só nome, categoria e estatísticas aparecem. Data de nascimento e jogos futuros nunca aparecem.</p>
          )}
        </fieldset>
        <label className="toggle cartao">
          <span>
            <b>Mostrar foto no perfil público</b>
            <span className="muted small" style={{ display: 'block' }}>Desligado: aparecem as iniciais.</span>
          </span>
          <input id="jog-foto-pub" type="checkbox" checked={f.foto_publica} onChange={(e) => setF({ ...f, foto_publica: e.target.checked })} />
        </label>
        <Erro msg={erro} />
        <button className="btn btn-primario" disabled={salvando}>
          {salvando ? 'Salvando…' : id ? 'Salvar' : 'Cadastrar jogador'}
        </button>
      </form>
    </main>
  );
}
